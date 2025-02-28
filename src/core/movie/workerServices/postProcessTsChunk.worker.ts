import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Injectable } from '@nestjs/common';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import { uploadFile } from '../movie.utils'
import { S3Service } from 'src/Infrastructure/s3/s3.service';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { MOVIE_BUCKET, CALL_BACK_CHECK_INTERVAL, POST_PROCESSING_DELAY, TS_CHUNK_SNAPSHOT_DELAY } from '../movie.config';

export const checkQueueFinished = async (tsChunkProcessQueue: Queue, videoName: string): Promise<boolean> => {
  const jobs: Job[] = await tsChunkProcessQueue.getJobs(['waiting', 'active']);
  const isStillHaveJob = jobs.some(job => job.id?.toString().startsWith(videoName + '-'));
  if (isStillHaveJob) {
    console.log('Queue is not finished yet', jobs.length);
    await new Promise((resolve) => setTimeout(resolve, CALL_BACK_CHECK_INTERVAL));
    return await checkQueueFinished(tsChunkProcessQueue, videoName)
  } else {
    return true
  }
}


const checkjob = async (tsChunkProcessQueue: Queue, videoName: string) => {
  try {
    const jobs: Job[] = await tsChunkProcessQueue.getJobs(['waiting', 'active', 'delayed']);
    const isStillHaveJob = jobs.some(job => job.id?.toString().startsWith(videoName + '-'));

    // If no more jobs in queue, remove the processed directory
    if (!isStillHaveJob) {
      console.log('No more jobs in queue');
      await fs.promises.rm(path.resolve(`processed/${videoName}`), { recursive: true, force: true });
      console.log(`Directory processed/${videoName} removed.`);
      tsChunkProcessQueue.clean(0, 'completed')
      return {
        success: true,
        message: 'Jobs completed cleaning up'
      }
      // If there are still jobs in queue, wait for the job to complete
    } else {
      const completedListener = async (job: Job) => {
        if (job.id?.toString().startsWith(videoName + '-')) {
          tsChunkProcessQueue.removeListener('completed', completedListener);
          await checkjob(tsChunkProcessQueue, videoName);
        }
      };
      tsChunkProcessQueue.on('completed', completedListener);
    }
  } catch (error) {
    console.error(`Error checking jobs for ${videoName}:`, error);
    return {
      success: false,
      message: 'Error checking jobs'
    }
  }
};

@Injectable()
@Processor('video-post-process')
export class tsChunkProcesser {
  constructor(
    @InjectQueue('video-post-process')
    private readonly tsChunkProcessQueue: Queue,
    private readonly dockerServices: DockerService,
    private readonly s3Service: S3Service,
  ) { }



  async thumbnailRender(videoName: string, tsChunkName: string, dirName: string) {
    try {

      const webpName = tsChunkName.replace('.ts', '.webp')
      await this.dockerServices.renderTSchunkThumnail(videoName, tsChunkName,)
      await new Promise((resolve) => setTimeout(() => resolve(true), TS_CHUNK_SNAPSHOT_DELAY))
    } catch (error) {
      console.log('Error rendering thumbnail:', error);

    }
  }


  @Process('upload-snapshot')
  async uploadSnapShot(job: Job<{ snapShotPaths: string[], videoName: string }>) {
    const { videoName } = job.data;
    const uploadPromises: Promise<void>[] = [];

    console.log('Uploading snapshot to s3...');
    const concurrencyLimit = 10;
    let currentIndex = 0;

    while (currentIndex < job.data.snapShotPaths.length) {
      const batch = job.data.snapShotPaths.slice(currentIndex, currentIndex + concurrencyLimit);

      batch.forEach((file) => {
        const fullFilePath = path.resolve(file);
        const webpName = path.basename(file);
        uploadPromises.push(uploadFile(fullFilePath, this.s3Service.s3, 'movie-bucket', `${videoName}/snapshot/${webpName}`));
      });

      await Promise.all(uploadPromises);
      currentIndex += concurrencyLimit;
    }

    console.log('All snapshot uploaded.');
    return { success: true, message: 'Snapshot upload completed!' };

  }


  @Process({
    name: 'ts-chunk-process',
  })
  async handleVideoTranscoding(
    job: Job<{ tsChunkBatchPaths: string[], videoName: string, batchType: 'normal' | 'rest' }>,
  ) {
    const { tsChunkBatchPaths, videoName } = job.data;

    const promiseAll: Promise<void>[] = []

    const dirName = path.dirname(tsChunkBatchPaths[0])
    for (const tsChunkPath of tsChunkBatchPaths) {
      const baseName = path.basename(tsChunkPath)
      const ext = path.extname(baseName)
      if (ext === '.m3u8') {
        const m3u8Content = fs.readFileSync(tsChunkPath, 'utf-8')
        const modifiedM3u8Content = m3u8Content.replaceAll('segment', `${process.env.S3_SERVICE_ENDPOINT}/${MOVIE_BUCKET}/${videoName}/segment`)
        await this.s3Service.s3.upload({
          Bucket: 'movie-bucket',
          Key: `${videoName}/${baseName}`,
          Body: modifiedM3u8Content,
        }).promise()
        console.log('M3u8 file uploaded completed')
      } else {
        chokidar.watch(tsChunkPath, {
          persistent: true,
          awaitWriteFinish: {
            stabilityThreshold: 3000,
            pollInterval: 150
          }
        }).once('add', async () => {
          promiseAll.push(uploadFile(tsChunkPath, this.s3Service.s3, 'movie-bucket', `${videoName}/${baseName}`))
          promiseAll.push(this.thumbnailRender(videoName, baseName, dirName))
        })
      }
    }

    await Promise.all(promiseAll)
    await new Promise((resolve) => setTimeout(() => resolve(true), POST_PROCESSING_DELAY))
    return { success: true, message: 'Video transcoding completed!' };
  }

  @Process('clean-up-ts-chunk')
  async cleanUpTsChunk(job: Job<{ videoName: string }>) {
    const { videoName } = job.data;
    await checkjob(this.tsChunkProcessQueue, videoName)
  }
}
