This is a quick tool to inspect and work with files uploaded to the BSV blockchain.
It also can query transactions.

You can view such files on the web at https://bico.media/, or upload them with a tool like bsvup.

Not all features are implemented.  As always, feel free to PR or fork and add on or rip up.

Examples:

    $ bitfiles status TX://<txid>
    $ bitfiles status D://<addr>[/optional/path]
    $ bitfiles status BCAT://<txid>
    $ bitfiles status C://<txid>

    $ bitfiles stream BCAT://<txid>
    $ bitfiles download D://<addr>[/optional/pth]

    $ bitfiles bitdb '{ bitdb json query }'

    $ git init
    $ D-to-git-fast-import <addr> | git fast-import

Listing of error.code values, a work in progress:

    AlreadyExists
        provided data is already present
    NoResults
        request matched nothing
    InvalidData
        provided data does not work
    UnknownError
        something else (should detect and update source)
        see error.original for details

