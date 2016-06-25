# Voodle
Vocal prototyping for physical user interfaces.

--

###Setting up Voodle:
* 1. Clone Voodle by opening a terminal window and navigating to a directory of your choice and typing: `git clone https://github.com/ubcspin/Voodle.git`. (You need git in your path to do this, if you don't want to install git you can download Voodle as a zip directly from github).
* 2. Note the two JSON files: `package[mac_use_this].json` and `package[windows_use_this].json.` If you are running OSX or linux rename `package[mac_use_this].json` -> `package.json`. If you are running Windows rename `package[windows_use_this].json` -> `package.json`. 
* 3. Install [Node here](https://nodejs.org/en/). After the install, you may have to restart terminal.
* 4. Open a terminal window and navigate to the root Voodle directory. Type: `npm install`.
* 5. Next, install React by typing `npm install react`. 
* 6. You will need to manually install the node-module 'node-core-audio'. The process is as follows:
	* **Windows/OSX users:**
		* 7. Clone the git repository `https://github.com/ZECTBynmo/node-core-audio.git` into your `node-modules` folder.
		* 8. Navigate into your `node-core-audio` folder and run `node-gyp rebuild`. It is possible that you need to install node-gyp by typing (perhaps as sudo) `npm install -g node-gyp`.

			*Note 1: if you are running Python >3:
		make sure Python < 3 && >= 2.7 is installed
			run `node-gyp rebuild --python=python2.7`
			*Note 2: if you are on a mac, MAY need to install the 'nan' package:
			`cd` to `node-core-audio`
			`npm i nan`
			*Note 3: If you are still having node-gyp problems ensure that you have the requisite dependencies outlined here: https://www.npmjs.com/package/node-gyp .
	* **Linux users:**
		* Clone the git repository `https://github.com/ZECTBynmo/node-core-audio.git` into your `node-modules` folder.
		* Navigate into your `node-core-audio` folder and replace `portaudio` with this source `http://www.portaudio.com/archives/pa_stable_v19_20140130.tgz`.
		* In the `portaudio` folder type: `./configure`;(sudo)`make install`.
		* cd .. back to your `node-core-audio` folder and open the `binding.gyp` file. Replace the `OS=="linux"',{...}` clause with the following:
		```
		'OS=="linux"', {
		"libraries" : [
		'<(module_root_dir)/portaudio/lib/.libs/libportaudio.so',
		'<(module_root_dir)/portaudio/include/portaudio.h'
		],
		'cflags': [ "-fno-exceptions -lrt -lasound -ljack -lpthread -fPIC" ],
		'cflags!': [ "-fno-exceptions-lrt -lasound -ljack -lpthread -fPIC" ],
		'cflags_cc!': [ "-fno-exceptions -lrt -lasound -ljack -lpthread -fPIC"],
		'cflags_cc': [ "-std=c++0x -lrt -lasound -ljack -lpthread -fPIC" ]
		}
		```

		* In the `node-core-audio` folder run `node-gyp rebuild`.
		* Dearest linux users, if you find you are running into new install problems, even if solved them yourselves, please notify me at damarino (at) cs.ubc.ca.

###Running Voodle:

* First you will need to deploy. This only needs to be done once with each stable version. Open a terminal window and ensure you are in the root of Voodle and type `npm run deploy`.
	* Note (optional): If you are looking to do some development of your own you can run the dev server with `npm run dev` at `localhost:1337`.
* To start Voodle, type `npm start`.
* Open a new browser window and go to `localhost:2000`.
* Just have fun.

--
(Archive)
##Processing Voodle
###Setting up Processing Voodle:

* Processing Voodle requires Processing. You can download it here: [https://processing.org/](https://processing.org/).

Note that older versions of Voodle use the processing sound library. The most recent versions (>=1.3) of this library have dependencies that are only available to OSX/Linux users. You can download previous releases of sound here: https://github.com/processing/processing-sound/releases.
