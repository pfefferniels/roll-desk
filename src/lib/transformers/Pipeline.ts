import { AbstractTransformer, TransformationOptions } from "./Transformer";

type Transformer = AbstractTransformer<TransformationOptions>

export class Pipeline {
    head: Transformer | null
    length: number

    constructor(head: Transformer) {
        this.head = head
        let current: Transformer | undefined = this.head
        let counter = 0;
        while (current) {
            counter++
            current = current.nextTransformer;
        }
        this.length = counter
    }

    push(transformer: Transformer) {
        if (!this.head) this.head = transformer

        let current = this.head;
        while (current.nextTransformer) current = current.nextTransformer
        current.setNext(transformer)
        this.length++
    }

    at(n: number): Transformer | null {
        if (n > this.length || n < 0) return null
        if (n === 0) return this.head
        let current = this.head
        for (let i = 0; i < n; i++) {
            if (!current?.nextTransformer) return null
            current = current.nextTransformer
        }
        return current
    }

    erase(n: number) {
        // TODO 
    }

    insert(n: number, transformer: Transformer) {
        // TODO
    }
}

