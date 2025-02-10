//Movie Cateory Entity


export class Category {
    private _id: string | null;
    private _name: string;
    private _description: string | null;
    private _createdAt: Date;
    private _updatedAt: Date;

    constructor(id: string | null, name: string, description: string | null, createdAt: Date, updatedAt: Date) {
        this._id = id;
        this._name = name;
        this._description = description;
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;
    }

    // Verify if the entity is valid

    static isValidName(name: string): {
        isValid: boolean,
        message: string
    } {
        if (!name || name.trim() === "") {
            return {
                isValid: false,
                message: "Category name is required"
            }
        }
        if (name.length < 3) {
            return {
                isValid: false,
                message: "Category name must be at least 3 characters long"
            }
        }
        return {
            isValid: true,
            message: "Category name is valid"
        }
    }

    static isValidDescription(description: string): {
        isValid: boolean,
        message: string
    } {
        if (description && description.length < 3) {
            return {
                isValid: false,
                message: "Category description must be at least 3 characters long"
            }
        }
        return {
            isValid: true,
            message: "Category description is valid"
        }
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
