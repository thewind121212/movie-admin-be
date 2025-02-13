import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import { uploadFile } from '../movie.utils'
import { S3Service } from 'src/Infrastructure/s3/s3.service';
import chokidar from 'chokidar';
import path from 'path';



@Injectable()
@Processor('video-post-process')
export class tsChunkProcesser {
  constructor(
    private readonly dockerServices: DockerService,
    private readonly s3Service: S3Service,
  ) { }



  async thumbnailRenderAndUpload(videoName: string, tsChunkName: string, dirName: string) {
    const webpName = tsChunkName.replace('.ts', '.webp')
    await this.dockerServices.renderTSchunkThumnail(videoName, tsChunkName)
    chokidar.watch(`${dirName}/thumbnail/${webpName}`, {
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    }).on('add', async () => {
      await uploadFile(`${dirName}/thumbnail/${webpName}`, this.s3Service.s3, 'movie-bucket', `${videoName}/snapshot/${webpName}`)
    })

  }

  @Process('ts-chunk-process')
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
        promiseAll.push(uploadFile(tsChunkPath, this.s3Service.s3, 'movie-bucket', `${videoName}/${baseName}`))
        continue
      }
      promiseAll.push(uploadFile(tsChunkPath, this.s3Service.s3, 'movie-bucket', `${videoName}/${baseName}`))
      promiseAll.push(this.thumbnailRenderAndUpload(videoName, baseName, dirName))
    }

    await Promise.all(promiseAll)
    return { success: true, message: 'Video transcoding completed!' };
  }
}
