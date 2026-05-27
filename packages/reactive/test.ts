import {createStore} from "./src/index"

const [s, set] = createStore({
    "name": "ibou",
    "last_name": "toure"
})

console.log('store is', s)

set({"age": "29"})
console.log('store age is', s   )