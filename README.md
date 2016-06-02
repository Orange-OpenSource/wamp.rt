# wamp.rt: A WAMP V2 nodejs router
##Copyright Orange 2014, All Rights Reserved

wamp.rt is a WebSocket Application Messaging Protocol [WAMP](http://wamp.ws/) V2 router implementation based on nodejs.

The router is compliant with the WAMP V2 [Basic Profile](https://github.com/tavendo/WAMP/blob/master/spec/basic.md).

wamp.rt implements both [Dealer](https://github.com/tavendo/WAMP/blob/master/spec/basic.md#peers-and-roles) and [Broker](https://github.com/tavendo/WAMP/blob/master/spec/basic.md#peers-and-roles) roles.

## Build Instructions

Install using npm. Depending on what you want to do, your mileage may vary.

## Credits

wamp.rt has been inspired by the following Open Source projects:

- [wamp.io](https://github.com/nicokaiser/wamp.io) 


## Changes to internal api
2016-04-03:
- ticket auth support added

2016-03-09:
- internal api moved to realm
- callrpc method has args & kwargs arguments
- publish method does not require message id
