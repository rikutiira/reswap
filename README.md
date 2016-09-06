# Reswap

### Reswap is still in early development, 0.1.x is not a stable release yet!

**Reswap is a fully reactive state container built on the current [observable proposal](https://github.com/tc39/proposal-observable).** It is inspired by Clojure's take on mutable state, atoms, and Reagent's (ClojureScript's React Wrapper) reactive atoms.

Current popular JavaScript state containers have comparably a lot of boilerplate or depend on reacting to mutable state. Reswap follows the predictable state model made popular by Redux but aims to simplify it by reducing boilerplate and decreasing the amount of concepts to learn. Another major difference is that Reswap is built on observables, enabling powerful asynchronous patterns out of the box without having to learn any library code tailored for Reswap.

In that way it's inspired by other reactive state containers but with two important points. One, it's built on observable spec and supports existing FRP libraries out of the box. Two, it is **not** built on need to mutate objects, as mutation introduces complexity, is error-prone and is especially troublesome in asynchronous and concurrent programs. You cannot control who mutates what, and you cannot track where and when it happens. It does not necessarily scale.

Reswap aims to be simple yet scalable.

## Library features
- **Simple reactive API** which gives your program just enough structure but gives freedom to choose the architecture around it.
- **Built on ECMAScript observable proposal**, will work with all Observable libraries supporting the spec.
- **Stores are observables** holding state as their current value. The state can only be changed by reducers defined by the store.
- **No imperative dispatch()**, or dispatch at all, to be exact. **Reducers are also built on observables and update store through reacting to other observables**. You can, however, also push data to reducers directly as convenience to work with imperative APIs. Reactive reducers are great for programs dealing with concurrency and enable nice separation of concerns.
- **Works with existing FRP libraries out of the box**, such as [Kefir](https://rpominov.github.io/kefir/), [RXJS](http://reactivex.io/) and [Most](https://github.com/cujojs/most). If it supports ES Observables, it works. Other FRP libraries are also interoperable with small amount of glue code.
- **Focus on immutable data** but since JavaScript has no immutable API, it is not enforced and works with mutable state as well.
- **Debug mode** which will tell if you are accidentally mutating state in or out of your reducers.
- **No mandatory actions**, the idea is to avoid unnecessary granular code and have as little boilerplate as possible. Actions make sense if you have multiple sources interested in some event, otherwise you can just directly update your store. This usually means having multiple stores listening to an action or wanting side-effects as reactions to actions. Reswap comes with a simple helper for creating actions. Much like stores, they are simply observables which you can push values to.
- **Application state** is easily built from multiple reactive stores, and it scales better and is easier to optimize than a single-store approach, still giving all the same benefits due to being built on observables. Your reactive stores can be as large or as small as you want to.

## How it looks

```js
/**
 * store.js
 */
import { create, reducer, combine } from 'reswap'

const addTodo = (currentState, todo) => currentState.concat(todo)
const deleteTodos = (currentState, deletableTodos) => {
    const todos = [].concat(deletableTodos)
    return currentState.filter((todo) => todos.indexOf(todo.id) === -1)
}

//simply use object literals for application state
const store = {
    todos: create([], //give initial value to your store
        //use reducer to listen to observable source, todos are added to store as it emits new values
        reducer('todosFromServer', serverTodos$, addTodo),

        //you can push data to reducer with no observable source as shown in consumer.js
        reducer('todosFromClient', addTodo),

        //you can omit the name if there is no need to observe or call the reducer from outside
        //also notice "merge" helper which can be used to listen to multiple observable sources
        reducer(merge(deleteTodo$, deleteTodos$), deleteTodos)
    )
}

export default store
```

```js
/**
 * consumer.js
 */
import store from './store'

//subscribe to store, instantly getting current state and get new states as store is updated
store.subscribe({
    next: (state) => console.log(state)
})

//you can also directly subscribe to a specific reducer (which has no current state)
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