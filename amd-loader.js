/*
 * DIY handler used by the dumpDefaults task to check the AMD loader.
 * create() records each result as an amd-<name> setting. Modules come from
 * the amd folder next to this script.
 */
useLibrary( 'amd' );

const defaultBase = define.config().baseUrl;
define.config( { baseUrl: defaultBase + '/amd/' } );

function attempt( task ) {
	try {
		return 'returns ' + task();
	} catch ( ex ) {
		// errors from module engines arrive wrapped in an SEScriptException
		return 'throws ' + String( ex.message ).replace( /^.*Error: /, '' ).replace( / in \S+ at line number \d+$/, '' );
	}
}

function getResults( diy ) {
	var results = {};

	results['config-defaultBase'] = String( defaultBase ) === String( __dirname );
	results['config-trailingSlash'] = String( define.config().baseUrl ) === defaultBase + '/amd';

	define( [ 'shared', 'dependent', 'require' ], function ( shared, dependent, require ) {
		results['cache-dependency'] = dependent.shared === shared;
		results['cache-require'] = require( 'shared' ) === shared;
	} );

	results['define-value'] = define( [ 'shared' ], function () {
		return 'value';
	} );
	define( 'named', [], function () {
		return 'named value';
	} );
	results['define-named'] = define( [ 'named' ], function ( named ) {
		return named;
	} );
	results['define-object'] = define( { object: true } ).object;

	diy.settings.set( 'AmdProbe', 'card setting' );
	results['settings-read'] = define( [ 'settings' ], function ( read ) {
		return read();
	} );

	results['isolated-inside'] = define( [ 'isolated' ], function ( inside ) {
		return inside;
	} );
	results['isolated-outside'] = typeof ModuleGlobal;

	results['error-plain'] = attempt( function () {
		return define( [ 'plain' ], function () {} );
	} );
	results['error-cycle'] = attempt( function () {
		return define( [ 'cycle-a' ], function () {} );
	} );
	results['error-twice'] = attempt( function () {
		return define( [ 'twice' ], function () {} );
	} );
	// the message names the file, which depends on the checkout
	results['error-missing'] = attempt( function () {
		return define( [ 'missing' ], function () {} );
	} ).indexOf( 'throws' ) === 0;

	define( [ 'require' ], function ( require ) {
		var environment = { Marker: 'from environment' };
		var plain = require( 'plain', environment );
		results['environment-plain'] = String( plain.PlainValue );
		results['environment-global'] = String( plain.PlainMarker );

		var library = require( 'markup', environment );
		results['environment-library'] = typeof library.markupBox;
		results['environment-shared'] = String( library.PlainValue );

		var other = require( 'plain', { Marker: 'other' } );
		results['environment-separate'] = String( other.PlainMarker ) + ', ' + String( plain.PlainMarker );
		results['environment-host'] = typeof PlainValue;
	} );

	results['scope-define'] = typeof define;
	results['scope-require'] = typeof require;
	results['scope-ScriptMonkey'] = typeof ScriptMonkey;
	results['scope-loadModule'] = typeof loadModule;
	results['scope-modules'] = typeof modules;
	return results;
}

function create( diy ) {
	diy.faceStyle = arkham.diy.DIY.FaceStyle.ONE_FACE;
	diy.frontTemplateKey = 'AHLCG-Enemy-Default';

	var results = getResults( diy );
	for ( let name in results ) {
		diy.settings.set( 'amd-' + name, String( results[name] ) );
	}
}
