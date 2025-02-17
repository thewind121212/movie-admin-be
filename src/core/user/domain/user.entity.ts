export class User {
    public _id: string | null;
    public email: string;
    public password: string;

    constructor(id, email, password) {
        this._id = id;
        this.email = email;
        this.password = password;
    }
}

export class RegisterRequest {
    public email: string;

    constructor(email: string) {
        this.email = email;
    }

    public static validate(email: string): boolean {
        return email.includes('@');
    }
}