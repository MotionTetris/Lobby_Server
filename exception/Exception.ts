import { HttpException, HttpStatus } from "@nestjs/common";

export class Exception extends HttpException {

    constructor(message: string, error ?: any){
        super({
            status: HttpStatus.BAD_REQUEST,
            error:message
        },
        HttpStatus.BAD_REQUEST)
    }

    
}