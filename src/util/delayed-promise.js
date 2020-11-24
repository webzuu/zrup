export default function delayedPromise(getter, minDelay, maxDelay)
{
    minDelay = minDelay || 0;
    maxDelay = Math.max(minDelay, maxDelay || minDelay);
    const delay = Math.round(Math.random() * (maxDelay - minDelay) + minDelay);
    return new Promise((resolve)=>{ setTimeout(() => resolve(getter()), delay); });
}
