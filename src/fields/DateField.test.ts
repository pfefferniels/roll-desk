import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { dateAfterPicking } from './DateField'

const stated = new Date(2015, 0, 1)
const halfTyped = dayjs(new Date(NaN))

describe('a field the model asks a date for', () => {
    it('takes the date that was picked', () => {
        expect(dateAfterPicking(dayjs(new Date(2019, 5, 1)), stated, false))
            .toEqual(new Date(2019, 5, 1))
    })

    it('keeps the stated date when the field is emptied', () => {
        expect(dateAfterPicking(null, stated, false)).toEqual(stated)
    })

    it('keeps the stated date while a date is being typed', () => {
        expect(dateAfterPicking(halfTyped, stated, false)).toEqual(stated)
    })
})

describe('a field the model marks optional', () => {
    it('states no date once the field is emptied', () => {
        expect(dateAfterPicking(null, stated, true)).toBeUndefined()
    })

    it('keeps the stated date while a date is being typed', () => {
        expect(dateAfterPicking(halfTyped, stated, true)).toEqual(stated)
    })

    it('takes a date picked where none was stated', () => {
        expect(dateAfterPicking(dayjs(new Date(2019, 5, 1)), undefined, true))
            .toEqual(new Date(2019, 5, 1))
    })
})
