//Movie Cateory Entity

export class Genre {
  public _id: string | null;
  public _name: string;
  public _description: string | null;
  public _createdAt: Date;
  public _updatedAt: Date;

  constructor(
    id: string | null,
    name: string,
    description: string | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._name = name;
    this._description = description;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // Verify if the entity is valid

  static isValidName(name: string): {
    isValid: boolean;
    message: string;
  } {
    if (!name || name.trim() === '') {
      return {
        isValid: false,
        message: 'Genre name is required',
      };
    }
    if (name.length < 3) {
      return {
        isValid: false,
        message: 'Genre name must be at least 3 characters long',
      };
    }
    return {
      isValid: true,
      message: 'Genre name is valid',
    };
  }

  static isValidDescription(description: string): {
    isValid: boolean;
    message: string;
  } {
    if (description && description.length < 3) {
      return {
        isValid: false,
        message: 'Genre description must be at least 3 characters long',
      };
    }
    return {
      isValid: true,
      message: 'Genre description is valid',
    };
  }

  // Getters for accessing properties
  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  get description() {
    return this._description;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }
}
