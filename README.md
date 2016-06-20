# Voodle
Vocal prototyping for physical user interfaces.

--
##React Voodle
###Setting up React Voodle:

* Install [React](https://facebook.github.io/react/) and [Node](https://nodejs.org/en/).
* Navigate to the React Voodle directory in terminal and type: `npm install`
* You will need to manually install the node-module 'node-core-audio' because of reasons.
	* **Windows/OSX users:**
		* Clone the git repository `https://github.com/ZECTBynmo/node-core-audio.git` into your `node-modules` folder.
		* Navigate into your `node-core-audio` folder and run `node-gyp rebuild`.
		*NOTE: if you are running Python >3:
		make sure Python < 3 && >= 2.7 is installed
			run node-gyp rebuild --python=python2.7
		* Note if you are on a mac, MAY need to install the 'nan' package:
			`cd` to `node-core-audio`
			`npm i nan`
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


###Running React Voodle:

* Open a terminal window and type: `npm run dev`.
* While this process is running, open a *new* terminal window in the React Voodle directory and type: `node server.js`.
* Open a new browser window and go to `localhost:8080`.

--
##Processing Voodle
###Setting up Processing Voodle:

* Processing Voodle requires Processing. You can download it here: [https://processing.org/](https://processing.org/).

Note that older versions of Voodle use the processing sound library. The most recent versions (>=1.3) of this library have dependencies that are only available to OSX/Linux users. You can download previous releases of sound here: https://github.com/processing/processing-sound/releases.
