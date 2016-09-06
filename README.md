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
- **No mandatory actions**, the idea is to avoid unnecessary granular code and have as little boilerplate as possible. Actions make sense if you have multiple sources interested in any given event, otherwise you can just directly update your store. Wanting actions usually means having multiple interested stores or needing side-effects as reactions to said actions. Reswap actions are simply observables which you can push values to.
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
        reducer(todosFromServer$, addTodo),

        //you can also create named reducers which you can push data directly to, as shown in consumer.js
        reducer('todosFromClient', addTodo),

        //it's easy to combine together multiple observable sources as well
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

//subscribe to store, instantly getting current state as well
store.subscribe({
    next: (state) => console.log(state)
})

//you can push data to named reducers, useful when working with imperative APIs
//this is often equivalent to calling dispatch() in flux implementations
store.reducers.todosFromClient({ id: 1, name: 'Todo from client' })
```