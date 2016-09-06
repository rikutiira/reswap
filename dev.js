import Observable from 'zen-observable'
import Kefir from 'kefir'
import reswap, { reducer, action, merge, combine } from './src'

const assign = (...values) => Object.assign({}, ...values)

const testAction = action((data) => data + 1)

const testObservable = Kefir.sequentially(3000, ['bar', 'babar', 'babazbar'])
const testObservable2 = Kefir.sequentially(4000, [1, 2, 3, 4, 5])
const testObservable3 = new Observable((observer) => {
    testAction.subscribe({
        next: (value) => observer.next(value + 1)
    })
})

//global config, possible adapters (Kefir, RXJS, etc)
reswap.config({
    debug: true,
    to: (observable) => Kefir.fromESObservable(observable), //all returned observables by reswap are automatically converted to kefir streams
})

const store = reswap.store({ foo: '', bar: { baz: '' }, plus1: 0, plus2: 0 },
    reducer('foo', (currentState, value, value2) => assign(currentState, { foo: currentState.foo + value + value2 })),
    reducer(combine([testObservable, testObservable2]), (currentState, value) =>
        assign(currentState, { bar: assign(currentState.bar, { baz: value }) })),
    reducer(combine([testAction, testObservable3]), (currentState, [plus1, plus2]) =>
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