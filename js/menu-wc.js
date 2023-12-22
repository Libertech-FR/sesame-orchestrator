'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">Sesame Orchestrator</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter additional">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#additional-pages"'
                            : 'data-bs-target="#xs-additional-pages"' }>
                            <span class="icon ion-ios-book"></span>
                            <span>Additional documentation</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="additional-pages"' : 'id="xs-additional-pages"' }>
                                    <li class="link ">
                                        <a href="additional-documentation/demon.html" data-type="entity-link" data-context-id="additional">Demon</a>
                                    </li>
                                    <li class="link ">
                                        <a href="additional-documentation/queue-processor-service.html" data-type="entity-link" data-context-id="additional">Queue processor service</a>
                                    </li>
                        </ul>
                    </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/AuthModule.html" data-type="entity-link" >AuthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AuthModule-1a8a3b439e6df9880d6d961b0b7d2446ed5b6dbb2ef0efe629881ee184d27cb3cacf9334c04dc267166488067f498fe763b799a936a392a5d6a21dc5ec68e2d8"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-1a8a3b439e6df9880d6d961b0b7d2446ed5b6dbb2ef0efe629881ee184d27cb3cacf9334c04dc267166488067f498fe763b799a936a392a5d6a21dc5ec68e2d8"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-1a8a3b439e6df9880d6d961b0b7d2446ed5b6dbb2ef0efe629881ee184d27cb3cacf9334c04dc267166488067f498fe763b799a936a392a5d6a21dc5ec68e2d8"' :
                                            'id="xs-controllers-links-module-AuthModule-1a8a3b439e6df9880d6d961b0b7d2446ed5b6dbb2ef0efe629881ee184d27cb3cacf9334c04dc267166488067f498fe763b799a936a392a5d6a21dc5ec68e2d8"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-1a8a3b439e6df9880d6d961b0b7d2446ed5b6dbb2ef0efe629881ee184d27cb3cacf9334c04dc267166488067f498fe763b799a936a392a5d6a21dc5ec68e2d8"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-1a8a3b439e6df9880d6d961b0b7d2446ed5b6dbb2ef0efe629881ee184d27cb3cacf9334c04dc267166488067f498fe763b799a936a392a5d6a21dc5ec68e2d8"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-1a8a3b439e6df9880d6d961b0b7d2446ed5b6dbb2ef0efe629881ee184d27cb3cacf9334c04dc267166488067f498fe763b799a936a392a5d6a21dc5ec68e2d8"' :
                                        'id="xs-injectables-links-module-AuthModule-1a8a3b439e6df9880d6d961b0b7d2446ed5b6dbb2ef0efe629881ee184d27cb3cacf9334c04dc267166488067f498fe763b799a936a392a5d6a21dc5ec68e2d8"' }>
                                        <li class="link">
                                            <a href="injectables/AuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/HeaderApiKeyStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HeaderApiKeyStrategy</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/BackendsModule.html" data-type="entity-link" >BackendsModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-BackendsModule-45418f5d4ebb98ecbd7275afa5608f099c1e3c1a56fa196ff993239c4c630c2fb7e3fb8bb607b49054273660ce4a6b71c0ed591b724e9b484fc4aa41736ccc37"' : 'data-bs-target="#xs-controllers-links-module-BackendsModule-45418f5d4ebb98ecbd7275afa5608f099c1e3c1a56fa196ff993239c4c630c2fb7e3fb8bb607b49054273660ce4a6b71c0ed591b724e9b484fc4aa41736ccc37"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-BackendsModule-45418f5d4ebb98ecbd7275afa5608f099c1e3c1a56fa196ff993239c4c630c2fb7e3fb8bb607b49054273660ce4a6b71c0ed591b724e9b484fc4aa41736ccc37"' :
                                            'id="xs-controllers-links-module-BackendsModule-45418f5d4ebb98ecbd7275afa5608f099c1e3c1a56fa196ff993239c4c630c2fb7e3fb8bb607b49054273660ce4a6b71c0ed591b724e9b484fc4aa41736ccc37"' }>
                                            <li class="link">
                                                <a href="controllers/BackendsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >BackendsController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-BackendsModule-45418f5d4ebb98ecbd7275afa5608f099c1e3c1a56fa196ff993239c4c630c2fb7e3fb8bb607b49054273660ce4a6b71c0ed591b724e9b484fc4aa41736ccc37"' : 'data-bs-target="#xs-injectables-links-module-BackendsModule-45418f5d4ebb98ecbd7275afa5608f099c1e3c1a56fa196ff993239c4c630c2fb7e3fb8bb607b49054273660ce4a6b71c0ed591b724e9b484fc4aa41736ccc37"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-BackendsModule-45418f5d4ebb98ecbd7275afa5608f099c1e3c1a56fa196ff993239c4c630c2fb7e3fb8bb607b49054273660ce4a6b71c0ed591b724e9b484fc4aa41736ccc37"' :
                                        'id="xs-injectables-links-module-BackendsModule-45418f5d4ebb98ecbd7275afa5608f099c1e3c1a56fa196ff993239c4c630c2fb7e3fb8bb607b49054273660ce4a6b71c0ed591b724e9b484fc4aa41736ccc37"' }>
                                        <li class="link">
                                            <a href="injectables/BackendsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >BackendsService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CoreModule.html" data-type="entity-link" >CoreModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-CoreModule-e831ed3fa58200ed506a5e4797bf7d8664bab63a1775452d6f79838128f9bdbc6ab6a7fd80d34458b7ac35982dfa1657e9439a4e08e7fee8a91a6aea5f6d3f41"' : 'data-bs-target="#xs-controllers-links-module-CoreModule-e831ed3fa58200ed506a5e4797bf7d8664bab63a1775452d6f79838128f9bdbc6ab6a7fd80d34458b7ac35982dfa1657e9439a4e08e7fee8a91a6aea5f6d3f41"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-CoreModule-e831ed3fa58200ed506a5e4797bf7d8664bab63a1775452d6f79838128f9bdbc6ab6a7fd80d34458b7ac35982dfa1657e9439a4e08e7fee8a91a6aea5f6d3f41"' :
                                            'id="xs-controllers-links-module-CoreModule-e831ed3fa58200ed506a5e4797bf7d8664bab63a1775452d6f79838128f9bdbc6ab6a7fd80d34458b7ac35982dfa1657e9439a4e08e7fee8a91a6aea5f6d3f41"' }>
                                            <li class="link">
                                                <a href="controllers/CoreController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CoreController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CoreModule-e831ed3fa58200ed506a5e4797bf7d8664bab63a1775452d6f79838128f9bdbc6ab6a7fd80d34458b7ac35982dfa1657e9439a4e08e7fee8a91a6aea5f6d3f41"' : 'data-bs-target="#xs-injectables-links-module-CoreModule-e831ed3fa58200ed506a5e4797bf7d8664bab63a1775452d6f79838128f9bdbc6ab6a7fd80d34458b7ac35982dfa1657e9439a4e08e7fee8a91a6aea5f6d3f41"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CoreModule-e831ed3fa58200ed506a5e4797bf7d8664bab63a1775452d6f79838128f9bdbc6ab6a7fd80d34458b7ac35982dfa1657e9439a4e08e7fee8a91a6aea5f6d3f41"' :
                                        'id="xs-injectables-links-module-CoreModule-e831ed3fa58200ed506a5e4797bf7d8664bab63a1775452d6f79838128f9bdbc6ab6a7fd80d34458b7ac35982dfa1657e9439a4e08e7fee8a91a6aea5f6d3f41"' }>
                                        <li class="link">
                                            <a href="injectables/CoreService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CoreService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/IdentitiesModule.html" data-type="entity-link" >IdentitiesModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-IdentitiesModule-26462ed87d7c5a2b208d72fe43128da7daced1baffb1ad155ad45c0307bdcf508eba00c7f0fc57f752c9605a8536d9689bcc87ff8253e1e6997edab583df5f7a"' : 'data-bs-target="#xs-controllers-links-module-IdentitiesModule-26462ed87d7c5a2b208d72fe43128da7daced1baffb1ad155ad45c0307bdcf508eba00c7f0fc57f752c9605a8536d9689bcc87ff8253e1e6997edab583df5f7a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-IdentitiesModule-26462ed87d7c5a2b208d72fe43128da7daced1baffb1ad155ad45c0307bdcf508eba00c7f0fc57f752c9605a8536d9689bcc87ff8253e1e6997edab583df5f7a"' :
                                            'id="xs-controllers-links-module-IdentitiesModule-26462ed87d7c5a2b208d72fe43128da7daced1baffb1ad155ad45c0307bdcf508eba00c7f0fc57f752c9605a8536d9689bcc87ff8253e1e6997edab583df5f7a"' }>
                                            <li class="link">
                                                <a href="controllers/IdentitiesController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IdentitiesController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-IdentitiesModule-26462ed87d7c5a2b208d72fe43128da7daced1baffb1ad155ad45c0307bdcf508eba00c7f0fc57f752c9605a8536d9689bcc87ff8253e1e6997edab583df5f7a"' : 'data-bs-target="#xs-injectables-links-module-IdentitiesModule-26462ed87d7c5a2b208d72fe43128da7daced1baffb1ad155ad45c0307bdcf508eba00c7f0fc57f752c9605a8536d9689bcc87ff8253e1e6997edab583df5f7a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IdentitiesModule-26462ed87d7c5a2b208d72fe43128da7daced1baffb1ad155ad45c0307bdcf508eba00c7f0fc57f752c9605a8536d9689bcc87ff8253e1e6997edab583df5f7a"' :
                                        'id="xs-injectables-links-module-IdentitiesModule-26462ed87d7c5a2b208d72fe43128da7daced1baffb1ad155ad45c0307bdcf508eba00c7f0fc57f752c9605a8536d9689bcc87ff8253e1e6997edab583df5f7a"' }>
                                        <li class="link">
                                            <a href="injectables/IdentitiesService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IdentitiesService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/IdentitiesValidationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IdentitiesValidationService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/IdentitiesValidationModule.html" data-type="entity-link" >IdentitiesValidationModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-IdentitiesValidationModule-1127715797a809c2524470f0c1952b9ac3c228b0ef487eeed5dd9e1577e65aacc34c0aec2267625641695ada5c1c6faabc55781ad5f8d58e0932fd11123735ea"' : 'data-bs-target="#xs-injectables-links-module-IdentitiesValidationModule-1127715797a809c2524470f0c1952b9ac3c228b0ef487eeed5dd9e1577e65aacc34c0aec2267625641695ada5c1c6faabc55781ad5f8d58e0932fd11123735ea"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IdentitiesValidationModule-1127715797a809c2524470f0c1952b9ac3c228b0ef487eeed5dd9e1577e65aacc34c0aec2267625641695ada5c1c6faabc55781ad5f8d58e0932fd11123735ea"' :
                                        'id="xs-injectables-links-module-IdentitiesValidationModule-1127715797a809c2524470f0c1952b9ac3c228b0ef487eeed5dd9e1577e65aacc34c0aec2267625641695ada5c1c6faabc55781ad5f8d58e0932fd11123735ea"' }>
                                        <li class="link">
                                            <a href="injectables/IdentitiesValidationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IdentitiesValidationService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/ManagementModule.html" data-type="entity-link" >ManagementModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-ManagementModule-0a8a714f5c33c17c35363322daa4e57611fb2a25cae05c98737659b762def843b15432003babcd33fefc8220f087d103e5f18a55963f97a89654f1fb2963b941"' : 'data-bs-target="#xs-controllers-links-module-ManagementModule-0a8a714f5c33c17c35363322daa4e57611fb2a25cae05c98737659b762def843b15432003babcd33fefc8220f087d103e5f18a55963f97a89654f1fb2963b941"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-ManagementModule-0a8a714f5c33c17c35363322daa4e57611fb2a25cae05c98737659b762def843b15432003babcd33fefc8220f087d103e5f18a55963f97a89654f1fb2963b941"' :
                                            'id="xs-controllers-links-module-ManagementModule-0a8a714f5c33c17c35363322daa4e57611fb2a25cae05c98737659b762def843b15432003babcd33fefc8220f087d103e5f18a55963f97a89654f1fb2963b941"' }>
                                            <li class="link">
                                                <a href="controllers/ManagementController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ManagementController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ManagementModule-0a8a714f5c33c17c35363322daa4e57611fb2a25cae05c98737659b762def843b15432003babcd33fefc8220f087d103e5f18a55963f97a89654f1fb2963b941"' : 'data-bs-target="#xs-injectables-links-module-ManagementModule-0a8a714f5c33c17c35363322daa4e57611fb2a25cae05c98737659b762def843b15432003babcd33fefc8220f087d103e5f18a55963f97a89654f1fb2963b941"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ManagementModule-0a8a714f5c33c17c35363322daa4e57611fb2a25cae05c98737659b762def843b15432003babcd33fefc8220f087d103e5f18a55963f97a89654f1fb2963b941"' :
                                        'id="xs-injectables-links-module-ManagementModule-0a8a714f5c33c17c35363322daa4e57611fb2a25cae05c98737659b762def843b15432003babcd33fefc8220f087d103e5f18a55963f97a89654f1fb2963b941"' }>
                                        <li class="link">
                                            <a href="injectables/ManagementService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ManagementService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/PasswdModule.html" data-type="entity-link" >PasswdModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-PasswdModule-e8ba2a4eb5816cbfb96a4f984061d087d92536c4d9aa3934b34ef17481d5cad12fd20d10c9f7e659d70f1d838965a13832f43eae2bcb580162296b4adf371d49"' : 'data-bs-target="#xs-controllers-links-module-PasswdModule-e8ba2a4eb5816cbfb96a4f984061d087d92536c4d9aa3934b34ef17481d5cad12fd20d10c9f7e659d70f1d838965a13832f43eae2bcb580162296b4adf371d49"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-PasswdModule-e8ba2a4eb5816cbfb96a4f984061d087d92536c4d9aa3934b34ef17481d5cad12fd20d10c9f7e659d70f1d838965a13832f43eae2bcb580162296b4adf371d49"' :
                                            'id="xs-controllers-links-module-PasswdModule-e8ba2a4eb5816cbfb96a4f984061d087d92536c4d9aa3934b34ef17481d5cad12fd20d10c9f7e659d70f1d838965a13832f43eae2bcb580162296b4adf371d49"' }>
                                            <li class="link">
                                                <a href="controllers/PasswdController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PasswdController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PasswdModule-e8ba2a4eb5816cbfb96a4f984061d087d92536c4d9aa3934b34ef17481d5cad12fd20d10c9f7e659d70f1d838965a13832f43eae2bcb580162296b4adf371d49"' : 'data-bs-target="#xs-injectables-links-module-PasswdModule-e8ba2a4eb5816cbfb96a4f984061d087d92536c4d9aa3934b34ef17481d5cad12fd20d10c9f7e659d70f1d838965a13832f43eae2bcb580162296b4adf371d49"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PasswdModule-e8ba2a4eb5816cbfb96a4f984061d087d92536c4d9aa3934b34ef17481d5cad12fd20d10c9f7e659d70f1d838965a13832f43eae2bcb580162296b4adf371d49"' :
                                        'id="xs-injectables-links-module-PasswdModule-e8ba2a4eb5816cbfb96a4f984061d087d92536c4d9aa3934b34ef17481d5cad12fd20d10c9f7e659d70f1d838965a13832f43eae2bcb580162296b4adf371d49"' }>
                                        <li class="link">
                                            <a href="injectables/PasswdService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PasswdService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#controllers-links"' :
                                'data-bs-target="#xs-controllers-links"' }>
                                <span class="icon ion-md-swap"></span>
                                <span>Controllers</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="controllers-links"' : 'id="xs-controllers-links"' }>
                                <li class="link">
                                    <a href="controllers/AppController.html" data-type="entity-link" >AppController</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AbstractController.html" data-type="entity-link" >AbstractController</a>
                            </li>
                            <li class="link">
                                <a href="classes/AbstractQueueProcessor.html" data-type="entity-link" >AbstractQueueProcessor</a>
                            </li>
                            <li class="link">
                                <a href="classes/AbstractSchema.html" data-type="entity-link" >AbstractSchema</a>
                            </li>
                            <li class="link">
                                <a href="classes/AdditionalFieldsPart.html" data-type="entity-link" >AdditionalFieldsPart</a>
                            </li>
                            <li class="link">
                                <a href="classes/additionalFieldsPartDto.html" data-type="entity-link" >additionalFieldsPartDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/AskTokenDto.html" data-type="entity-link" >AskTokenDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ChangePasswordDto.html" data-type="entity-link" >ChangePasswordDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ConfigObjectAttributeDTO.html" data-type="entity-link" >ConfigObjectAttributeDTO</a>
                            </li>
                            <li class="link">
                                <a href="classes/ConfigObjectObjectClassDTO.html" data-type="entity-link" >ConfigObjectObjectClassDTO</a>
                            </li>
                            <li class="link">
                                <a href="classes/ConfigObjectSchemaDTO.html" data-type="entity-link" >ConfigObjectSchemaDTO</a>
                            </li>
                            <li class="link">
                                <a href="classes/ConsoleSession.html" data-type="entity-link" >ConsoleSession</a>
                            </li>
                            <li class="link">
                                <a href="classes/CustomFieldsDto.html" data-type="entity-link" >CustomFieldsDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ErrorSchemaDto.html" data-type="entity-link" >ErrorSchemaDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/Identities.html" data-type="entity-link" >Identities</a>
                            </li>
                            <li class="link">
                                <a href="classes/IdentitiesCreateDto.html" data-type="entity-link" >IdentitiesCreateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/IdentitiesDto.html" data-type="entity-link" >IdentitiesDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/IdentitiesUpdateDto.html" data-type="entity-link" >IdentitiesUpdateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/inetOrgPerson.html" data-type="entity-link" >inetOrgPerson</a>
                            </li>
                            <li class="link">
                                <a href="classes/inetOrgPersonCreateDto.html" data-type="entity-link" >inetOrgPersonCreateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/inetOrgPersonDto.html" data-type="entity-link" >inetOrgPersonDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/inetOrgPersonUpdateDto.html" data-type="entity-link" >inetOrgPersonUpdateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/MetadataDto.html" data-type="entity-link" >MetadataDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/MetadataPart.html" data-type="entity-link" >MetadataPart</a>
                            </li>
                            <li class="link">
                                <a href="classes/MetadataPartDto.html" data-type="entity-link" >MetadataPartDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/MongooseValidationFilter.html" data-type="entity-link" >MongooseValidationFilter</a>
                            </li>
                            <li class="link">
                                <a href="classes/NotFoundDto.html" data-type="entity-link" >NotFoundDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/PaginatedFilterDto.html" data-type="entity-link" >PaginatedFilterDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/PaginatedResponseDto.html" data-type="entity-link" >PaginatedResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ResetPasswordDto.html" data-type="entity-link" >ResetPasswordDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/VerifyTokenDto.html" data-type="entity-link" >VerifyTokenDto</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AbstractService.html" data-type="entity-link" >AbstractService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AbstractServiceSchema.html" data-type="entity-link" >AbstractServiceSchema</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AppService.html" data-type="entity-link" >AppService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuthGuard.html" data-type="entity-link" >AuthGuard</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/DtoValidationPipe.html" data-type="entity-link" >DtoValidationPipe</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ObjectIdValidationPipe.html" data-type="entity-link" >ObjectIdValidationPipe</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AbstractControllerContext.html" data-type="entity-link" >AbstractControllerContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AbstractServiceContext.html" data-type="entity-link" >AbstractServiceContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AutoIncrementPluginOptions.html" data-type="entity-link" >AutoIncrementPluginOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AutoIncrementPluginTrackerSpec.html" data-type="entity-link" >AutoIncrementPluginTrackerSpec</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ConfigInstance.html" data-type="entity-link" >ConfigInstance</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MongoosePlugin.html" data-type="entity-link" >MongoosePlugin</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RawBodyBufferOptions.html" data-type="entity-link" >RawBodyBufferOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ServiceSchemaInterface.html" data-type="entity-link" >ServiceSchemaInterface</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ValidationRecursive.html" data-type="entity-link" >ValidationRecursive</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});