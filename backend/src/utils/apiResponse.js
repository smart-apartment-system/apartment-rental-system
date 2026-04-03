class ApiResponse{
    constructor(statusCode,data,message="Success"){
        this.statusCode=statusCode < 400 ? statusCode : 200;
        this.message=message;
        this.success=true;
        this.data=data;
    }
}

export {ApiResponse};