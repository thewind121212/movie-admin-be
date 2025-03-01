//Cateogry Movie Application Layer

import { Injectable } from '@nestjs/common';
import { GenreRepository } from '../genre.repositories';
import { createGenre as createGenreServiceUnit } from './createGenre.service';

@Injectable()
export class GenreService {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly genreRepository: GenreRepository) {}

  async createGenre(name: string, description: string) {
    return await createGenreServiceUnit(
      name,
      description,
      this.genreRepository,
    );
  }
}
