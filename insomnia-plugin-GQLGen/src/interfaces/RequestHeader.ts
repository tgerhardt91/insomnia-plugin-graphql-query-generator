export class RequestHeader {
    public name: string;
    public value: string;

    constructor(_name: string, _value: string) {
        this.name = _name;
        this.value = _value;
    }
}