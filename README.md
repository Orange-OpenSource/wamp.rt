# FOX.WAMP is a WAMP v2 message router implementation

The message router is compliant with the [WAMP V2 Basic Profile](http://wamp-proto.org/).

## Build Instructions

Install using npm. Depending on what you want to do, your mileage may vary.

## Credits

fox.wamp has been inspired by the following Open Source projects:

- [wamp.io](https://github.com/nicokaiser/wamp.io) 
- [wamp.rt](https://github.com/Orange-OpenSource/wamp.rt) 


## Changes:
2016-04-03:
- ticket auth support added

2016-03-09:
- internal api moved to realm
- callrpc method has args & kwargs arguments
- publish method does not require message id

2017-04-26:
- integration with [StatsD](https://github.com/etsy/statsd)
