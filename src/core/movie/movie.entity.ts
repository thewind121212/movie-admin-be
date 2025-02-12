// Movie Entity

import { movieEntityType } from "src/interface/movie.interface";

export class Movie {

    public _id: string | null;
    public _name: string;
    public _description?: string | null;
    public _createdAt: Date
    public _updatedAt: Date;
    public _genres: string[] | null;
    public _mp4FilePath?: string;
    public _releaseYear: number;
    public _hlsFilePathS3: string | null;
    public _duration: number;
    public _thumbnail: string;
    public _views: number;
    public _likes: number;
    public _dislikes: number;
    public _status: 'UPLOADED' | 'CONVERTING' | 'COMPLETED'
    public _isPublished: boolean;


    constructor(movieEntity: movieEntityType) {
        const { id, name, description, createdAt, updatedAt, releaseYear, dislikes, likes, views, isPublished, status } = movieEntity;
        this._id = id;
        this._name = name;
        this._description = description;
        this._releaseYear = releaseYear;
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;
        this._dislikes = dislikes
        this._likes = likes;
        this._views = views;
        this._isPublished = isPublished;
        this._status = status;
    }


    //validate


    static validateRegisterUploadTicket(
        name: string,
        description: string,
        genres: string[],
        releaseYear: number
    ) : {
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

    //Setter or Mutator

    setCategory(genres: string[]) {
        this._genres = genres;
    }

    setMp4FilePath(mp4FilePath: string) {
        this._mp4FilePath = mp4FilePath;
    }

    setHlsFilePathS3(hlsFilePathS3: string) {
        this._hlsFilePathS3 = hlsFilePathS3;
    }

    setDuration(duration: number) {
        this._duration = duration;
    }

    setThumbnail(thumbnail: string) {
        this._thumbnail = thumbnail;
    }

    setViews(views: number) {
        this._views = views;
    }

    setLikes(likes: number) {
        this._likes = likes;
    }

    setDislikes(dislikes: number) {
        this._dislikes = dislikes;
    }

    setStatus(status: 'UPLOADED' | 'CONVERTING' | 'COMPLETED') {
        this._status = status;
    }

    setIsPublished(isPublished: boolean) {
        this._isPublished = isPublished;
    }

}