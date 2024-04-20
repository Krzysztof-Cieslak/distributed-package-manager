# Distributed Package Manager

Distributed Package Manager is VSCode extension that allows you to install and manage VSCode extensions from sources different than the official marketplace. It may be useful for managing packages from private repositories or for managing packages that are not (yet) available in the official marketplace - for example, packages that are still in development.

## Supported package sources

-   GitHub releases

## Planned package sources

-   GitHub Actions Artifacts
-   Custom HTTP(S) endpoints
-   And more

## How does it work?

Distributed Package Manager uses application-scope (this means you can't override it on the workspace level) VSCode setting for defining list of package sources. You can define package sources in the following format:

```json
{
    "distributed-package-manager.sources": [
        {
            "type": "gh-release",
            "repository": "{owner}/{repo}"
        }
    ]
}
```

Extension reads this list on the startup and then uses it to fetch package information from the defined sources. If the new version of package is available it will automatically download and install it.
For GitHub releases and actions extension uses GitHub API to fetch information about the releases and artifacts, using the user logged in to the VSCode.

## Imposter Syndrome Disclaimer

I want your help. _No really, I do_.

There might be a little voice inside that tells you you're not ready; that you need to do one more tutorial, or learn another framework, or write a few more blog posts before you can help me with this project.

I assure you, that's not the case.

And you don't just have to write code. You can help out by writing documentation, tests, or even by giving feedback about this work. (And yes, that includes giving feedback about the contribution guidelines.)

Thank you for contributing!

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Copyright

The library is available under [MIT license](LICENSE.md), which allows modification and redistribution for both commercial and non-commercial purposes.

<a target="_blank" href="https://icons8.com/icon/jILwmhTFbMBD/cloud-development">Cloud</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
