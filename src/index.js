import symbolObservable from 'symbol-observable'
import deepEqual from 'deep-equal'
import Observable from 'zen-observable'

const fromObservable = (observable) => isESObservable(observable) ? Observable.from(observable) : observable

const configurables = {
  debug: false,

  from(observable) {
    return fromObservable(observable)
  },
  to(observable) {
    return observable
  },
  withCallable(observable, callable) {
    let callableWithObservable = Object.assign(callable, observable)
    Object.setPrototypeOf(callableWithObservable, observable)

    return callableWithObservable
  }
}

const first = (arr = []) => arr[0],
      last = (arr = []) => arr[arr.length-1],
      find = (arr = [], f) => arr.filter(f)[0],
      isObjOrFunc = (obj) => obj && (typeof obj === 'object' || typeof obj === 'function'),
      isESObservable = (obs) => isObjOrFunc(obs) && Boolean(obs[symbolObservable]),
      isZenObservable = (obs) => isObjOrFunc(obs) && Boolean(Observable.prototype['@@observable'] === obs['@@observable']),
      isObservable = (obs) => isESObservable(obs) || isZenObservable(obs),
      removeObserver = (obss, remObs, f = () => {}) => () => {
        obss.splice(obss.indexOf(remObs), 1)
        f()
      },
      combineObservables = (observables) => {
        let observers = [],
            currentValues = new Map()

        observables.forEach((observable) => {
          fromObservable(observable).subscribe({
            next(value) {
              currentValues.set(observable, value)

              if (currentValues.size === observables.length) {
                const values = observables.map((observable) => currentValues.get(observable))
                observers.forEach((observer) => {
                  observer.next(values)
                })
              }
            }
          })
        })

        return new Observable((observer) => {
          observers.push(observer)

          return removeObserver(observers, observer)
        })
      },
      mergeObservables = (observables) => {
        let observers = []

        observables.forEach((observable) => {
          configurables.from(observable).subscribe({
            next(value) {
              observers.forEach((observer) => {
                observer.next(value)
              })
            }
          })
        })

        return new Observable((observer) => {
          observers.push(observer)

          return removeObserver(observers, observer)
        })
      }

const create = (initialState, ...reducers) => {
  let storeState = initialState,
      previousStoreState,
      storeObservers = []

  const updateStore = (name, reducerObservers = [], transformer, ...args) => {
    if (configurables.debug) {
      previousStoreState =  JSON.parse(JSON.stringify(storeState))
    }

    Promise.all(args).then((data) => {
      const newStoreState = transformer(storeState, ...data)

      if (configurables.debug) {
        if (storeState === newStoreState && !deepEqual(previousStoreState, newStoreState)) {
          console.warn(`Possible accidental mutation by reducer: ${name || 'unnamed'}`, { previousState: previousStoreState, state: newStoreState })
        }
      }

      storeState = newStoreState

      storeObservers.concat(reducerObservers).forEach((observer) => {
        observer.next(storeState)
      })
    })
  }

  let store = configurables.to(new Observable((observer) => {
    storeObservers.push(observer)
    observer.next(storeState)

    return removeObserver(storeObservers, observer)
  }))

  store.reducers = Object.assign({}, ...Object.keys(reducers)
    .map((key) => {
      let reducerObservers = []

      const { name, observable, transformer } = reducers[key],
            update = (...args) => updateStore(name, reducerObservers, transformer, ...args)

      if (observable) {
        configurables.from(observable).subscribe({
          next(value) {
            update(value)
          }
        })
      }

      if (name) {
        let reducerFunc = (...args) => {
          if (observable) {
            throw new Error('Observing reducer is not callable')
          }
          update(...args)
        }

        let reducerObservable = new Observable((observer) => {
          reducerObservers.push(observer)

          return removeObserver(reducerObservers, observer)
        })

        return { [name]: configurables.withCallable(configurables.to(reducerObservable), reducerFunc) }
      }
    })
    .filter(Boolean))

  return store
}

const reducer = (...args) => {
  const name = (typeof args[0] === 'string') ? args[0] : undefined,
        observable = find(args, isObservable),
        transformer = last(args)

  if (typeof transformer !== 'function' || 0 >= args.length > 3 || ([2,3].indexOf(args.length) !== -1 && (!name && !observable))) {
    throw new Error('reducers should be of format reducer([name?, [observable?]], reducerF)')
  }

  return { name, observable, transformer }
}

const action = (...args) => {
  let observers = []

  const observable = find(args, isObservable),
        transformer = last(args),
        update = (...args) => {
          const actionValue = transformer(...args)
          observers.forEach((observer) => {
            observer.next(actionValue)
          })
        }

  if (typeof transformer !== 'function' || 0 >= args.length > 2) {
    throw new Error('actions should be of format action([observable?], actionF)')
  }

  let actionFunc = (...args) => {
    if (observable) {
      throw new Error('Observing action is not callable')
    }
    update(...args)
  }

  let actionObservable = new Observable((observer) => {
    observers.push(observer)

    return removeObserver(observers, observer)
  })

  if (observable) {
    configurables.from(observable).subscribe({
      next(value) {
        update(value)
      }
    })
  }

  return configurables.withCallable(configurables.to(actionObservable), actionFunc)
}

const merge = (observables) => mergeObservables(observables)

const combine = (observables) => combineObservables(observables)

const config = (conf) => {
  configurables.from = conf.from || configurables.from
  configurables.to = conf.to || configurables.to
  configurables.debug = conf.debug || configurables.debug
}

export default { create, reducer, action, merge, combine, config }

export { create, reducer, action, merge, combine, config }
