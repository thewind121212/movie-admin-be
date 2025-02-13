import { Injectable } from "@nestjs/common";
import crypto from 'bcrypt'
import { TICKET_HASH_SALT_ROUND, VIDEO_PROCESSING_QUEUE_LIMIT } from "../movie.config";
import { MovieRepository } from "../repositories/movie.repositories";


@Injectable()

export class MovieDomainServices {

    constructor(
        private readonly movieRepository: MovieRepository
    ) { }


    static validateRegisterUploadTicket(
        name: string,
        description: string,
        genres: string[],
        releaseYear: number
    ): {
        isValid: boolean,
        message: string,
    } {
        if (!name) {
            return {
                isValid: false,
                message: 'Missing name movie'
            }
        }
        if (!description) {
            return {
                isValid: false,
                message: 'Missing description movie'
            }
        }
        if (!genres) {
            return {
                isValid: false,
                message: 'Missing genres movie'
            }
        }
        if (!releaseYear) {
            return {
                isValid: false,
                message: 'Missing release year movie'
            }
        }
        return {
            isValid: true,
            message: 'Valid'
        }
    }


    static hashTheTicket = (
        name: string,
        description: string,
        releaseYear: number,
    ): string => {
        const timeStamp = new Date().getTime().toString()
        const hashData = crypto.hashSync(name + description + releaseYear + timeStamp, TICKET_HASH_SALT_ROUND)
        return hashData
    }

    async isMaxBullQueue(): Promise<boolean> {
        const currentQueue = await this.movieRepository.getWaitingCount()
        if (currentQueue >= VIDEO_PROCESSING_QUEUE_LIMIT) {
            return true
        }
        return false
    }
}