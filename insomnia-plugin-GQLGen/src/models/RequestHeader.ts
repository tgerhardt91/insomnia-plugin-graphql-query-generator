import { v4 as uuidv4 } from 'uuid';

export class RequestHeader {
    public name: string;
    public value: string;
    public id;

    constructor(_name: string, _value: string) {
        this.name = _name;
        this.value = _value;
        this.id = uuidv4();
    }
}