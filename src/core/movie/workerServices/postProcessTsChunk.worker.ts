import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Injectable } from '@nestjs/common';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import { uploadFile } from '../movie.utils'
import { S3Service } from 'src/Infrastructure/s3/s3.service';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { MOVIE_BUCKET } from '../movie.config';

export const checkQueueFinished = async (tsChunkProcessQueue: Queue, videoName: string): Promise<boolean> => {
  const jobs: Job[] = await tsChunkProcessQueue.getJobs(['waiting', 'active']);
  const isStillHaveJob = jobs.some(job => job.id?.toString().startsWith(videoName + '-'));
  if (isStillHaveJob) {
    console.log('Quue is not finished yet');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return await checkQueueFinished(tsChunkProcessQueue, videoName)
  } else {
    return true
  }
}


const checkjob = async (tsChunkProcessQueue: Queue, videoName: string) => {
  try {
    const jobs: Job[] = await tsChunkProcessQueue.getJobs(['waiting', 'active', 'delayed']);
    const isStillHaveJob = jobs.some(job => job.id?.toString().startsWith(videoName + '-'));

    if (!isStillHaveJob) {
      console.log('No more jobs in queue');
      await fs.promises.rm(path.resolve(`processed/${videoName}`), { recursive: true, force: true });
      console.log(`Directory processed/${videoName} removed.`);
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



  async thumbnailRenderAndUpload(videoName: string, tsChunkName: string, dirName: string) {
    try {

      const webpName = tsChunkName.replace('.ts', '.webp')
      await this.dockerServices.renderTSchunkThumnail(videoName, tsChunkName)
      await new Promise((resolve) =>
        chokidar.watch(`${dirName}/thumbnail/${webpName}`, {
          persistent: true,
          awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
          }
        }).once('add', async () => {
          await uploadFile(`${dirName}/thumbnail/${webpName}`, this.s3Service.s3, MOVIE_BUCKET, `${videoName}/snapshot/${webpName}`)
          resolve(true)
        }))

    } catch (error) {
      console.log('Error rendering thumbnail:', error);

    }
  }

  @Process( {
    name: 'ts-chunk-process',
    concurrency: 2
  })
  async handleVideoTranscoding(
    job: Job<{ tsChunkBatchPaths: string[], videoName: string }>,
  ) {
    const { tsChunkBatchPaths, videoName } = job.data;



    const promiseAll: Promise<void>[] = []

    const dirName = path.dirname(tsChunkBatchPaths[0])
    for (const tsChunkPath of tsChunkBatchPaths) {
      const baseName = path.basename(tsChunkPath)
      const ext = path.extname(baseName)
      if (ext === '.m3u8') {
        //  ${process.env.S3_SERVICE_ENDPOINT}/${RAW_MOVIE_BUCKET}/} 
        const m3u8Content = fs.readFileSync(tsChunkPath, 'utf-8')
        const modifiedM3u8Content = m3u8Content.replaceAll('segment', `${process.env.S3_SERVICE_ENDPOINT}/${MOVIE_BUCKET}/${videoName}/segment`)
        await this.s3Service.s3.upload({
          Bucket: 'movie-bucket',
          Key: `${videoName}/${baseName}`,
          Body: modifiedM3u8Content,
        }).promise()
        continue
      }
      promiseAll.push(uploadFile(tsChunkPath, this.s3Service.s3, 'movie-bucket', `${videoName}/${baseName}`))
      promiseAll.push(this.thumbnailRenderAndUpload(videoName, baseName, dirName))
    }

    await Promise.all(promiseAll)
    return { success: true, message: 'Video transcoding completed!' };
  }

  @Process('clean-up-ts-chunk')
  async cleanUpTsChunk(job: Job<{ videoName: string }>) {
    const { videoName } = job.data;
    checkjob(this.tsChunkProcessQueue, videoName)
  }
}
