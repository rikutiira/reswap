import symbolObservable from 'symbol-observable'
import deepEqual from 'deep-equal'
import Observable from 'zen-observable'

const configurables = {
  debug: false,

  from: (observable) => isESObservable(observable) ? Observable.from(observable) : observable,
  to: (observable) => observable,
  withCallable: (observable, callable) => {
    let callableWithObservable = Object.assign(callable, observable)
    Object.setPrototypeOf(callableWithObservable, observable)

    return callableWithObservable
  }
}

const first = (arr = []) => arr[0],
      last = (arr = []) => arr[arr.length-1],
      find = (arr = [], f) => arr.filter(f)[0],
      isObjOrFunc = (obj) => obj && (typeof obj === 'object' || typeof obj === 'function'),
      isPromise = (p) => p && typeof p === 'object' && typeof p.then === 'function',
      isESObservable = (obs) => isObjOrFunc(obs) && Boolean(obs[symbolObservable]),
      isZenObservable = (obs) => isObjOrFunc(obs) && Boolean(Observable.prototype['@@observable'] === obs['@@observable']),
      isObservable = (obs) => isESObservable(obs) || isZenObservable(obs),
      removeObserver = (obss, remObs, f = () => {}) => () => {
        obss.splice(obss.indexOf(remObs), 1)
        f()
      },
      createStream = (observers) => new Observable((observer) => {
        observers.push(observer)
        return removeObserver(observers, observer)
      }),
      createProperty = (observers, currentValue) => new Observable((observer) => {
        observers.push(observer)
        observer.next(currentValue)
        return removeObserver(observers, observer)
      }),
      emit = (observers, value) => {
        observers.forEach((observer) => {
          observer.next(value)
        })
      },
      combineObservables = (observables) => {
        let observers = [],
            currentValues = new Map()

        observables.forEach((observable) => {
          configurables.from(observable).subscribe({
            next(value) {
              currentValues.set(observable, value)

              if (currentValues.size === observables.length) {
                const values = observables.map((observable) => currentValues.get(observable))
                emit(observers, values)
              }
            }
          })
        })

        return createStream(observers)
      },
      mergeObservables = (observables) => {
        let observers = []

        observables.forEach((observable) => {
          configurables.from(observable).subscribe({
            next(value) {
              emit(observers, value)
            }
          })
        })

        return createStream(observers)
      },
      isMutable = (value) => Object(value) === value,
      cloneDeep = (value) => {
        if (isMutable(value)) {
          let obj = {}
          for (let key in value) {
            obj[key] = cloneDeep(value[key])
          }
          return obj
        }
        return value
      }

const store = (initialState, ...reducers) => {
  let storeState = initialState,
      previousStoreState,
      storeObservers = [],
      store = configurables.to(createProperty(storeObservers, storeState))

  const updateStore = (name, transformer, ...args) => {
    if (configurables.debug) {
      previousStoreState = cloneDeep(storeState)
    }

    const newStoreState = transformer(storeState, ...args)

    if (configurables.debug) {
      if (storeState === newStoreState && !deepEqual(previousStoreState, newStoreState)) {
        console.warn(`Possible accidental mutation in reducer: ${name || 'unnamed'}`, { previousState: previousStoreState, state: newStoreState })
      }
    }

    storeState = newStoreState
    emit(storeObservers, storeState)
  }

  store.reducers = Object.assign({}, ...Object.keys(reducers)
    .map((key) => {

      const { source, transformer } = reducers[key],
            update = (...args) => updateStore(name, transformer, ...args)

      if (typeof source === 'string') {
        return { [source]: (...args) => update(...args) }
      } else {
        configurables.from(source).subscribe({
          next: (value) => update(value)
        })

        return false
      }
    })
    .filter(Boolean))

  store.get = () => storeState

  return store
}

const reducer = (source, transformer) => {
  if (typeof transformer !== 'function' || (typeof source !== 'string' && !isObservable(source))) {
    throw new Error('reducers should be of format reducer([source?], reducerF)')
  }

  return { source, transformer }
}

const action = (actionF) => {
  if (typeof actionF !== 'function') {
    throw new Error('actions should be of format action(actionF)')
  }

  const update = (...args) => {
    const actionValue = actionF(...args)

    isPromise(actionValue)
      ? actionValue.then((resolvedValue) => emit(observers, resolvedValue))
      : emit(observers, actionValue)
  }

  let observers = [],
      actionFunc = (...args) => update(...args),
      actionObservable = createStream(observers)

  return configurables.withCallable(configurables.to(actionObservable), actionFunc)
}

const merge = (observables) => mergeObservables(observables)

const combine = (observables) => combineObservables(observables)

const config = (conf) => {
  configurables.from = conf.from || configurables.from
  configurables.to = conf.to || configurables.to
  configurables.debug = conf.debug || configurables.debug
}

export default { store, reducer, action, merge, combine, config }

export { store, reducer, action, merge, combine, config }
