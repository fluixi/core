You are a senior developper you need to fix kettlejs framework to properly works. Actually things are bizarre when the page load sometimes the content is displayed sometimes it not displayed for the same page when refresh this is a kind of leak. Also the runtime insert method renderEffect is retriggering infinitlly for some pages like /login the error that we catch from the infinite inset is signal.ts:283 Reactive error: Error: insert too many times
    at insert (runtime.ts:328:13)
    at jsx-runtime.ts:317:9
    at Array.forEach (<anonymous>)
    at applyProps (jsx-runtime.ts:311:16)
    at createNativeElement (jsx-runtime.ts:214:3)
    at jsx (jsx-runtime.ts:189:12)
    at LoginPage (index.tsx:10:28)
    at lazy.ts:102:17
    at untrack (signal.ts:954:12)
    at LazyWrapper.createMemo.name [as fn] (lazy.ts:101:21)

So your work is to make the jsx-runtime to properly handle jsx like solidjs does and runtime at (packages/dom/src/lib/dom/runtime.ts) to provide a right runtime that match to solidjs dome expressions. You can rewrite them if needed by we want a proper work and robust real work implementation. The runtime should and both htm and html from lit html