export default function throwThe<E=Error>(e : E) : never
{
    throw e;
}
