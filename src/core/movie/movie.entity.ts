// Movie Entity

export class Movie {

    public _id: string | null;
    public _name: string;
    public _description?: string | null;
    public _createdAt: Date
    public _updatedAt: Date;
    public _category: string[] | null;
    public _isDeleted: boolean;
    public _mp4FilePath?: string;
    public _hlsFilePathS3: string | null;
    public _duration: number;
    public _thumbnail: string;
    public _views: number;
    public _likes: number;
    public _dislikes: number;
    public _status: ['uploaded', 'converting', 'completed']; 
    public _isPublished: boolean;


    constructor(id: string | null, name: string, description: string | null, createdAt: Date, updatedAt: Date, category: string[] | null) {
        this._id = id;
        this._name = name;
        this._description = description;
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;
    }

    //Setter or Mutator

    setCategory(category: string[]) {
        this._category = category;
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

    setStatus(status: ['uploaded', 'converting', 'completed']) {
        this._status = status;
    }

    setIsPublished(isPublished: boolean) {
        this._isPublished = isPublished;
    }

}