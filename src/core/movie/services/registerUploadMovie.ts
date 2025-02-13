import { ResponseType } from "src/interface/response.interface";
import { MovieDomainServices } from "../domain/movie.domainServices";

export  async function registerMovieUploadTicketService(
    name: string,
    description: string,
    genres: string[],
    releaseYear: number,
  ): Promise<ResponseType> {

    // call from domain services
    const isValidRegister = MovieDomainServices.validateRegisterUploadTicket(name, description, genres, releaseYear)
    if (!isValidRegister.isValid) {
      return {
        message: isValidRegister.message,
        status: 'error',
        data: null,
        created_at: new Date()
      }
    }


    // call from domain services
    const hashTicket = MovieDomainServices.hashTheTicket(name, description, releaseYear);

    // call from repository
    const writeTicketToRedis = await this.movieRepository.registerTicket(hashTicket, name, description, releaseYear);

    if (!writeTicketToRedis.completed) {
      return {
        message: 'Failed to register movie upload ticket',
        status: 'error',
        data: null,
        created_at: new Date()
      }
    }

    return {
      message: 'Movie upload ticket registered',
      status: 'success',
      data: {
        uploadTicket: hashTicket
      },
      created_at: new Date()
    }
  }