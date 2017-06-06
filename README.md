# Memory Demo CloudScript

A **draft proposal** of a [PlayFab CloudScript](https://api.playfab.com/docs/tutorials/landing-automation/writing-custom-cloud-script) for [Photon Realtime's Unity Memory Demo](https://doc.photonengine.com/en-us/realtime/current/tutorials/memory-demo).

Notes:

- The script is not approved (yet) by Exit Games nor PlayFab.
- The script is not battle tested (yet). Use at your own risk.
- The script contains a workaround for logging from CloudScript handlers not executed by client (adding logs to TitleData). 
The recommended (new) way is to use PlayStream events or an external logging service.
- I can't recommend enough [switching to TypeScript](https://blog.playfab.com/blog/typescript2) to avoid the CloudScript madness.

Links:

- [Uploading CloudScript](https://api.playfab.com/docs/tutorials/landing-automation/using-cloud-script)
- [Photon Realtime Webhooks](https://doc.photonengine.com/en-us/realtime/current/reference/webhooks).
- [Using Photon With PlayFab](https://api.playfab.com/docs/tutorials/landing-tournaments/using-photon-with-playfab)
