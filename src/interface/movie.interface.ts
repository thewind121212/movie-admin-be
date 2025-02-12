export interface movieRequestBody {
    title: string;
    description: string;
    year: number;
    duration: number;
    genre: string;
    director: string;
    writer: string;
    producer: string;
}

export interface ticketRegisterType {
    hashTicketKey: string
    status: 'REGISTER' | 'PROCESSING' | 'COMPLETED',
    name: string,
    desc: string,
    releaseYear: number,
}

export interface movieEntityType {
    id: string | null, name: string, description: string | null, createdAt: Date, updatedAt: Date, status: 'UPLOADED' | 'CONVERTING' | 'COMPLETED', releaseYear: number, dislikes: number, likes: number, views: number, isPublished: boolean
}