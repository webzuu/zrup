import chai from "chai";
import {PromiseKeeper} from "../../js/util/promise-keeper.js";
const expect = chai.expect;

describe("PromiseKeeper",() => {

    it("does not duplicate promises", () => {
        const pk = new PromiseKeeper();
        expect(pk.about("foo","1")).to.equal(pk.about("foo","1"));
    });

    it("distinguishes promises with different monikers", () => {
        const pk = new PromiseKeeper();
        expect(pk.about("foo","1")).to.not.equal(pk.about("foo","2"));
        expect(pk.about("foo","3")).to.not.equal(pk.about("bar","3"));
    });

    it("keeps a single promise", async ()=>{
        const pk = new PromiseKeeper();
        setTimeout(()=>{
            pk.about("foo","a").resolve(true);
        }, 250);
        expect(await pk.about("foo","a").promise).to.be.true;
    });

    it("keeps multiple promises", async() => {
        const pk = new PromiseKeeper();
        setTimeout(() => { pk.about("dep1","ready").resolve(true); },300);
        setTimeout(() => { pk.about("dep2","ready").resolve(true); },150);
        const [dep1, dep2] = await Promise.all([
            pk.about("dep1","ready").promise,
            pk.about("dep2","ready").promise,
        ]);
        expect(dep1).to.be.true;
        expect(dep2).to.be.true;
    });
});