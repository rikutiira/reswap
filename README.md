# Reswap

### Reswap is still in early development, 0.1.0 is not a stable release yet!

Reswap is a fully reactive state container built on the current observable proposal. It is inspired by Clojure's take on mutable state, atoms, and Reagent's (ClojureScript's React Wrapper) reactive atoms.

Current popular JavaScript state containers have comparably a lot of boilerplate or depend on reacting to mutable state. Reswap follows the predictable state model made popular by Redux but aims to make it simpler by reducing boilerplate, having smaller API and decreasing the amount of concepts to learn. Another major difference is that Reswap is built on observables, enabling powerful asynchronous patterns out of the box without having to learn any Reswap specific code. In that way it's inspired by other reactive libraries but with two major differences. One, it's built on asynchronous observables and supports existing FRP libraries out of the box. Two, it is **not** built on need to mutate objects, as mutation introduces incidental complexity, is error-prone and is especially troublesome in asynchronous and concurrent programs. It just does not scale well, while Reswap aims to be simple yet scalable.

## Library features
- **Simple API** which gives your program just enough structure but gives freedom to choose the architecture around it.
- **No imperative dispatch()**, all reducers are reactive. You can, however, also push data to reducer as convenience to work around imperative APIs and to reduce boilerplate.
- **Reactive reducers** enable separation of concerns which many imperative libraries are not capable of. They are great for concurrent, asynchronous programs.
- **Built on ECMAScript observable proposal**, will work with all Observable libraries supporting the spec.
- **Works with existing FRP libraries out of the box**, such as Kefir, RXJS and Most. Other FRP libraries are also interoperable with small amount of glue code.
- **Focus on immutable data** but since JavaScript has no immutable API, it is not enforced and works with mutable state as well.
- **Debug mode** which will tell if you are accidentally mutating data in your reducers.
- **No mandatory actions**, the idea is to have as little boilerplate as possible. A lot of actions are not generic, and there is necessarily no need to treat them as such. However, reactive actions are supported as well, and their API is nearly identical to creating observable stores. Use as many actions as you think it makes sense for your codebase.
- **Application state** is easily built from multiple reactive stores, and it scales better and is easier to optimize than a single-store approach, still giving all the same benefits due to being built on observables. Your reactive stores can be as large or as small as you want to.

## How it looks

```js
/**
 * store.js
 */
import { create, reducer, combine } from 'reswap'

//simply use object literals for application state
const store = {
    todos: create([], //give initial value to your store
        //use reducer to listen to observable source, todos are added to store as it emits new values
        reducer('todosFromServer', serverTodos$, (currentState, todo) => currentState.concat(todo)),

        //you can push data to reducer with no observable source as shown in consumer.js
        reducer('todosFromClient', (currentState, todo) => currentState.concat(todo)),

        //you can omit the name if there is no need to observe or call the reducer from outside
        //also notice "merge" helper which can be used to listen to multiple observable sources
        reducer(merge(deleteTodo$, deleteTodos$), (currentState, deletableTodos) => {
            const todos = [].concat(deletableTodos)
            return currentState.filter((todo) => todos.indexOf(todo.id) === -1)
        })
    )
}

export default store
```

```js
/**
 * consumer.js
 */
import store from './store'

//subscribe to store, instantly getting current value and get new values as store is updated
store.subscribe({
    next: (value) => console.log(value)
})

//you can also directly subscribe to a specific reducer (which has no current value)
//can be useful for reducer specific side-effects
store.reducers.todosFromServer.subscribe({
    next: (value) => console.log('value from server')
})

//you can push data to non-observable reducers, useful when working with imperative APIs
//this is equivalent to dispatch() calls in non-reactive flux implementations
store.reducers.todosFromClient([{ id: 1, name: 'Todo from client' }])

//you can also subscribe to a pushable reducer
store.reducers.todosFromClient.subscribe(...)
```