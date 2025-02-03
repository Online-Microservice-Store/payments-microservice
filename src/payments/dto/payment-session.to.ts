import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsNumber, IsPositive, IsString, Min, ValidateNested } from "class-validator";

export class PaymentSessionDto {
    @IsString()
    orderId: string;
     
    @IsString()
    currency: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({each: true})
    @Type( () => PaymentSessionItemDto)
    items: PaymentSessionItemDto[];

    @IsString()
    clientId: string;
}

export class PaymentSessionItemDto{
    @IsString()
    productId: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @IsPositive()
    quantity: number;   
}