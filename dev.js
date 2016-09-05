import Observable from 'zen-observable'
import Kefir from 'kefir'
import reswap, { reducer, action, merge, combine } from './src'

const assign = (...values) => Object.assign({}, ...values)

const testObservable = new Observable(() => {})
const testObservable2 = Kefir.sequentially(3000, ['bar', 'babar', 'babazbar'])
const testObservable3 = Kefir.sequentially(4000, [1, 2, 3, 4, 5])

const testAction = action((data) => data + 1)
const testAction2 = action(testAction, (data) => data + 1)

//global config, possible adapters (Kefir, RXJS, etc)
reswap.config({
    to: (observable) => Kefir.fromESObservable(observable), //all returned observables by reswap are automatically converted to kefir streams
})

const store = reswap.create({ foo: '', bar: { baz: '' }, plus1: 0, plus2: 0 },
    reducer('foo', (currentState, value, value2) => assign(currentState, { foo: currentState.foo + value + value2 })),
    reducer('bar', combine([testObservable2, testObservable3]), (currentState, value) =>
        assign(currentState, { bar: assign(currentState.bar, { baz: value }) })),
    reducer(combine([testAction, testAction2]), (currentState, [plus1, plus2]) =>
        assign(currentState, { plus1, plus2 }))
)

setTimeout(() => {
    let i = 0;
    let interval = setInterval(() => {
        if (++i === 4) {
            clearInterval(interval)
        }
        store.reducers.foo('test', 'wadafaaak')
    }, 1500)
}, 500)

store.onValue((value) => {
    console.log(JSON.parse(JSON.stringify(value)))
})

testAction(1)