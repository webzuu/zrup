import chai from "chai";
const expect = chai.expect;
import {reassemble} from "../../src/util/tagged-template.js";

function replacer(v) {
    return { toString: () => "replaced" };
}

const T = reassemble.bind(null, replacer);

describe('reassemble()', () => {
    it('replaces regular string', () => {
        expect(T`this is ${'unchanged'}`).to.equal('this is replaced');
    });
    it('skips replacement when variable is escaped by hash', () => {
        expect(T`this is #${'unchanged'}`).to.equal('this is unchanged');
    });
    it('performs replacement when the hash itself is escaped', () => {
        expect(T`this is \#${'unchanged'}`).to.equal('this is #replaced');
    });
    it('does not perform replacement when the backslash that would escape the hash is itself', () => {
        expect(T`this is \\#${'unchanged'}`).to.equal(String.raw`this is \unchanged`);
    });
    it('handles 3 backslashes correctly', () => {
        expect(T`this is \\\#${'unchanged'}`).to.equal(String.raw`this is \#replaced`);
    });
    it('handles 4 backslashes correctly', () => {
        expect(T`this is \\\\#${'unchanged'}`).to.equal(String.raw`this is \\unchanged`);
    });
})