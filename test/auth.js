'use strict';

var
    chai    = require('chai'),
    spies   = require('chai-spies'),
    expect  = chai.expect,
    WAMP    = require('../lib/protocol'),
    Session = require('../lib/session'),
    Router  = require('../lib/router');

chai.use(spies);

describe('authenticate', function() {
    var
        router,
        sender,
        cli;

    beforeEach(function(){
        sender = {};
        router = new Router();

        router.on('RealmCreated', function (realm, realmName) {
            realm.isSecured = true;
            realm.authenticate = function (secureDetails, secret, callback) {
                if (secureDetails.authid+'-secret' === secret)
                    callback();
                else
                    callback('authorization_failed');
            }
        });

        cli = new Session(router, sender, router.getNewSessionId());
        router.registerSession(cli);
    });

    afterEach(function(){
    })

    it('Joe AUTH:FAIL', function () {
        sender.send = chai.spy(
            function (msg, id, callback) {
                expect(msg[0]).to.equal(WAMP.CHALLENGE);
                expect(msg[1]).to.equal('ticket');
            }
        );
        cli.handle([WAMP.HELLO, 'test', {authid: 'joe', authmethods:['ticket']}]);
        expect(sender.send).to.have.been.called.once;

        sender.send = chai.spy(
            function (msg, id, callback) {
                expect(msg[0]).to.equal(WAMP.ABORT);
//                callback();
            }
        );
        cli.handle([WAMP.AUTHENTICATE, 'incorrect-secret']);
        expect(sender.send).to.have.been.called.once;
    });

    it('Joe AUTH:OK', function () {
        sender.send = chai.spy(
            function (msg, id, callback) {
                expect(msg[0]).to.equal(WAMP.CHALLENGE);
                expect(msg[1]).to.equal('ticket');
            }
        );
        cli.handle([WAMP.HELLO, 'test', {authid: 'joe', authmethods:['ticket']}]);
        expect(sender.send).to.have.been.called.once;

        sender.send = chai.spy(
            function (msg, id, callback) {
                expect(msg[0]).to.equal(WAMP.WELCOME);
            }
        );
        cli.handle([WAMP.AUTHENTICATE, 'joe-secret']);
        expect(sender.send).to.have.been.called.once;
    });

});
