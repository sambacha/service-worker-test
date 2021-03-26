import { recoverPersonalSignature } from 'eth-sig-util'
import { getAddress } from '@ethersproject/address'
import { gatherResponse } from '../utils'
import { Octokit } from '@octokit/rest'

/**
 * @param {*} request
 * Accpets id=<tweet id>
 * Accepts account=<eth address> // just used to aler client of incorrect signer found
 *
 * 1. fetch tweet data using tweet id
 * 2. construct signature data using handle from tweet
 * 3. recover signer of signature from tweet
 * 4. if signer is the expected address, update gist with address -> handle mapping
 */
export async function handleVerify(request) {
    // github api info
    const USER_AGENT = 'Cloudflare Worker'

    // format request for twitter api
    var requestHeaders = new Headers()
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'TWITTER_BEARER'.
    requestHeaders.append('Authorization', 'Bearer ' + TWITTER_BEARER)
    var requestOptions = {
        method: 'GET',
        headers: requestHeaders,
        redirect: 'follow',
    }
    const init = {
        headers: { 'content-type': 'application/json' },
    }
    // regex for parsing tweet
    const reg = new RegExp('(?<=sig:).*')
    let response

    try {
        // get tweet id and account from url
        const { searchParams } = new URL(request.url)
        let tweetID = searchParams.get('id')
        let account = searchParams.get('account')

        // get tweet data from twitter api
        const twitterURL = `https://api.twitter.com/2/tweets?ids=${tweetID}&expansions=author_id&user.fields=username`
        requestOptions.headers.set('Origin', new URL(twitterURL).origin) // format for cors
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ method: string; headers: Heade... Remove this comment to see the full error message
        const twitterRes = await fetch(twitterURL, requestOptions)

        // parse the response from Twitter
        const twitterResponse = await gatherResponse(twitterRes)

        // if no tweet or author found, return error
        if (!twitterResponse.data || !twitterResponse.includes) {
            return new Response(null, {
                status: 400,
                statusText: 'Invalid tweet id',
            })
        }

        // get tweet text and handle
        const tweetContent = twitterResponse.data[0].text
        const handle = twitterResponse.includes.users[0].username

        // parse sig from tweet
        const matchedText = tweetContent.match(reg)

        // if no proper signature or handle data found, return error
        if (
            !twitterResponse.data ||
            !twitterResponse.includes ||
            !matchedText
        ) {
            return new Response(null, {
                status: 400,
                statusText: 'Invalid tweet format',
            })
        }

        // construct data for EIP712 signature recovery
        const data = {
            types: {
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                ],
                Permit: [{ name: 'username', type: 'string' }],
            },
            domain: {
                name: 'Sybil Verifier',
                version: '1',
            },
            primaryType: 'Permit',
            message: {
                username: handle,
            },
        }

        // parse sig from tweet
        const sig = matchedText[0].slice(0, 132)

        // recover signer
        const signer = recoverPersonalSignature({
            data: JSON.stringify(data),
            sig,
        })

        // format with chekcsummed address
        const formattedSigner = getAddress(signer)

        // if signer found is not the expected signer, alert client and dont update gist
        if (account !== formattedSigner) {
            return new Response(null, init, {
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 0-2 arguments, but got 3.
                status: 400,
                statusText: 'Invalid account',
            })
        }

        const fileName = 'verified.json'
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'REPO_OWNER'.
        const githubPath = `/repos/${REPO_OWNER}/sybil-list/contents/`

        const fileInfo = await fetch(
            'https://api.github.com' + githubPath + fileName,
            {
                headers: {
                    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'GITHUB_AUTHENTICATION'.
                    Authorization: 'token ' + GITHUB_AUTHENTICATION,
                    'User-Agent': USER_AGENT,
                },
            }
        )
        const fileJSON = await fileInfo.json()
        const sha = fileJSON.sha

        // Decode the String as json object
        var decodedSybilList = JSON.parse(atob(fileJSON.content))
        decodedSybilList[formattedSigner] = {
            twitter: {
                timestamp: Date.now(),
                tweetID,
                handle,
            },
        }

        const stringData = JSON.stringify(decodedSybilList)
        const encodedData = btoa(stringData)

        const octokit = new Octokit({
            // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'GITHUB_AUTHENTICATION'.
            auth: GITHUB_AUTHENTICATION,
        })

        const updateResponse = await octokit.request(
            'PUT ' + githubPath + fileName,
            {
                // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'REPO_OWNER'.
                owner: `${REPO_OWNER}`,
                repo: 'sybil-list',
                path: fileName,
                message: 'Linking ' + formattedSigner + ' to handle: ' + handle,
                sha,
                content: encodedData,
            }
        )

        if (updateResponse.status === 200) {
            // respond with handle if succesul update
            response = new Response(handle, init, {
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 0-2 arguments, but got 3.
                status: 200,
                statusText: 'Succesful verification',
            })
        } else {
            response = new Response(null, init, {
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 0-2 arguments, but got 3.
                status: 400,
                statusText: 'Error updating list.',
            })
        }

        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.append('Vary', 'Origin')
    } catch (e) {
        response = new Response(null, init, {
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 0-2 arguments, but got 3.
            status: 400,
            statusText: 'Error:' + e,
        })
    }

    return response
}
