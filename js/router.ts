/**
 * Helper functions that when passed a request will return a
 * boolean indicating if the request uses that HTTP method,
 * header, host or referrer.
 */
const Method = method => req =>
    req.method.toLowerCase() === method.toLowerCase()
const Connect = Method('connect')
const Delete = Method('delete')
const Get = Method('get')
const Head = Method('head')
const Options = Method('options')
const Patch = Method('patch')
const Post = Method('post')
const Put = Method('put')
const Trace = Method('trace')

const Header = (header, val) => req => req.headers.get(header) === val
const Host = host => Header('host', host.toLowerCase())
const Referrer = host => Header('referrer', host.toLowerCase())

const Path = regExp => req => {
    const url = new URL(req.url)
    const path = url.pathname
    const match = path.match(regExp) || []
    return match[0] === path
}

/**
 * The Router handles determines which handler is matched given the
 * conditions present for each request.
 */
class Router {
    constructor() {
        this.routes = []
    }

    handle(conditions, handler) {
        // @ts-expect-error (2551) FIXME: Property 'routes' does not exist on type 'Router'
        this.routes.push({
            // @ts-expect-error (7006) FIXME: Parameter 'conditions' implicitly has an 'any' type
            conditions,
            // @ts-expect-error (2551) FIXME: Property 'routes' does not exist on type 'Router'
            handler,
        })
        return this
    }

    connect(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Connect, Path(url)], handler)
    }

    delete(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Delete, Path(url)], handler)
    }

    get(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Get, Path(url)], handler)
    }

    head(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Head, Path(url)], handler)
    }

    options(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Options, Path(url)], handler)
    }

    patch(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Patch, Path(url)], handler)
    }

    post(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Post, Path(url)], handler)
    }

    put(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Put, Path(url)], handler)
    }

    trace(url, handler) {
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        return this.handle([Trace, Path(url)], handler)
    }

    all(handler) {
        return this.handle([], handler)
        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
    }

    route(req) {
        const route = this.resolve(req)

        // @ts-expect-error (7006) FIXME: Parameter 'url' implicitly has an 'any' type.
        if (route) {
            return route.handler(req)
        }

        return new Response('resource not found', {
            status: 404,
            statusText: 'not found',
            headers: {
                'content-type': 'text/plain',
            },
        })
    }

    /**
     * resolve returns the matching route for a request that returns
     * true for all conditions (if any).
     */
    resolve(req) {
        return this.routes.find(r => {
        // @ts-expect-error (7006) FIXME: Parameter 'req' implicitly has an 'any' type.
            if (!r.conditions || (Array.isArray(r) && !r.conditions.length)) {
                return true
            // @ts-expect-error (2339) FIXME: Property 'conditions' does not exist on type 'any'
            }

            if (typeof r.conditions === 'function') {
                return r.conditions(req)
            }

            return r.conditions.every(c => c(req))
        })
    }
}

// @ts-expect-error (7006) FIXME: Parameter 'c' implicitly has an 'any' type.
module.exports = Router
