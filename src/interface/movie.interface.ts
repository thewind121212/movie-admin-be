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
}