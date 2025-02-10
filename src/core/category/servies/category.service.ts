//Cateogry Movie Application Layer


import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../category.repositories';
import { createCategory as createCategoryService } from './createCategory.service';

@Injectable()
export class CategoryService {

  constructor(private readonly categoryRepository: CategoryRepository) { }

  async createCategory(name: string, description: string) {
    return await createCategoryService(name, description, this.categoryRepository);
  }



}
