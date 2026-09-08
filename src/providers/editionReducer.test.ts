import { describe, expect, it } from 'vitest';
import { EditionOp } from 'linked-rolls';
import { EditionAction, editionReducer, editionState } from './editionReducer';
import { fixtureEdition } from '../helpers/editionFixture';

const retitle = (title: string): EditionOp => draft => { draft.title = title };

const edit = (title: string): EditionAction => ({ type: 'apply', op: retitle(title) });

const start = () => editionState(fixtureEdition());

/** The state a sequence of actions arrives at, from a fresh edition. */
const after = (...actions: EditionAction[]) => actions.reduce(editionReducer, start());

describe('the edition reducer', () => {
    it('leaves nothing behind when it is called twice for one dispatch', () => {
        const state = start();
        const action = edit('A');

        const first = editionReducer(state, action);
        const second = editionReducer(state, action);

        expect(state.past).toHaveLength(0);
        expect(first.past).toHaveLength(1);
        expect(second).toEqual(first);
    });

    it('takes both edits of an event, each starting from the state before it', () => {
        const both = after(edit('A'), edit('B'));

        expect(both.edition?.title).toBe('B');
        expect(both.past).toHaveLength(2);
    });

    it('walks back through as many undos as there were edits', () => {
        expect(after(edit('A'), edit('B'), { type: 'undo' }).edition?.title).toBe('A');

        const none = after(edit('A'), edit('B'), { type: 'undo' }, { type: 'undo' });
        expect(none.edition?.title).toBe('');
        expect(none.past).toHaveLength(0);
        expect(none.future).toHaveLength(2);
    });

    it('puts back what was undone, in the order it was made', () => {
        const redone = after(edit('A'), edit('B'), { type: 'undo' }, { type: 'undo' }, { type: 'redo' });

        expect(redone.edition?.title).toBe('A');
        expect(redone.past).toHaveLength(1);
        expect(redone.future).toHaveLength(1);
    });

    it('drops the future as soon as an edit is made after an undo', () => {
        const branched = after(edit('A'), { type: 'undo' }, edit('C'));

        expect(branched.edition?.title).toBe('C');
        expect(branched.future).toHaveLength(0);
    });

    it('leaves the state alone where there is nothing to undo or redo', () => {
        const state = start();

        expect(editionReducer(state, { type: 'undo' })).toBe(state);
        expect(editionReducer(state, { type: 'redo' })).toBe(state);
    });

    it('leaves the edition it was given untouched', () => {
        const edition = fixtureEdition();
        const applied = editionReducer(editionState(edition), edit('A'));

        expect(edition.title).toBe('');
        expect(applied.edition).not.toBe(edition);
    });
});
