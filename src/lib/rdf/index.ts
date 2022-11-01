import { uuid } from "../globals";

export class RdfEntity {
    id: string = uuid()

    public get uri() {
        return `http://measuring-early-records.org/${this.id}`
    }
}
