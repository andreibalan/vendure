import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { RequestHandler } from 'express';
import { Observable } from 'rxjs';
import { ConnectionOptions } from 'typeorm';

import { LanguageCode } from '../../../shared/generated-types';
import { CustomFields } from '../../../shared/shared-types';
import { Transitions } from '../common/finite-state-machine';
import { Order } from '../entity/order/order.entity';
import { OrderState } from '../service/helpers/order-state-machine/order-state';

import { AssetNamingStrategy } from './asset-naming-strategy/asset-naming-strategy';
import { AssetPreviewStrategy } from './asset-preview-strategy/asset-preview-strategy';
import { AssetStorageStrategy } from './asset-storage-strategy/asset-storage-strategy';
import { EmailGenerator, EmailTypes } from './email/email-options';
import { EmailTransportOptions } from './email/email-transport-options';
import { EntityIdStrategy } from './entity-id-strategy/entity-id-strategy';
import { OrderMergeStrategy } from './order-merge-strategy/order-merge-strategy';
import { PaymentMethodHandler } from './payment-method/payment-method-handler';
import { PromotionAction } from './promotion/promotion-action';
import { PromotionCondition } from './promotion/promotion-condition';
import { ShippingCalculator } from './shipping-method/shipping-calculator';
import { ShippingEligibilityChecker } from './shipping-method/shipping-eligibility-checker';
import { TaxCalculationStrategy } from './tax/tax-calculation-strategy';
import { TaxZoneStrategy } from './tax/tax-zone-strategy';
import { VendurePlugin } from './vendure-plugin/vendure-plugin';

/**
 * @description
 * The AuthOptions define how authentication is managed.
 *
 * @docsCategory auth
 * @docsWeight 0
 */
export interface AuthOptions {
    /**
     * @description
     * Disable authentication & permissions checks.
     * NEVER set the to true in production. It exists
     * only to aid certain development tasks.
     *
     * @default false
     */
    disableAuth?: boolean;
    /**
     * @description
     * Sets the method by which the session token is delivered and read.
     *
     * * 'cookie': Upon login, a 'Set-Cookie' header will be returned to the client, setting a
     *   cookie containing the session token. A browser-based client (making requests with credentials)
     *   should automatically send the session cookie with each request.
     * * 'bearer': Upon login, the token is returned in the response and should be then stored by the
     *   client app. Each request should include the header 'Authorization: Bearer <token>'.
     *
     * @default 'cookie'
     */
    tokenMethod?: 'cookie' | 'bearer';
    /**
     * @description
     * The secret used for signing the session cookies for authenticated users. Only applies when
     * tokenMethod is set to 'cookie'.
     *
     * In production applications, this should not be stored as a string in
     * source control for security reasons, but may be loaded from an external
     * file not under source control, or from an environment variable, for example.
     *
     * @default 'session-secret'
     */
    sessionSecret?: string;
    /**
     * @description
     * Sets the header property which will be used to send the auth token when using the 'bearer' method.
     *
     * @default 'vendure-auth-token'
     */
    authTokenHeaderKey?: string;
    /**
     * @description
     * Session duration, i.e. the time which must elapse from the last authenticted request
     * after which the user must re-authenticate.
     *
     * Expressed as a string describing a time span per
     * [zeit/ms](https://github.com/zeit/ms.js).  Eg: `60`, `'2 days'`, `'10h'`, `'7d'`
     *
     * @default '7d'
     */
    sessionDuration?: string | number;
    /**
     * @description
     * Determines whether new User accounts require verification of their email address.
     *
     * If set to "true", when registering via the `registerCustomerAccount` mutation, one should *not* set the
     * `password` property - doing so will result in an error. Instead, the password is set at a later stage
     * (once the email with the verification token has been opened) via the `verifyCustomerAccount` mutation.
     *
     * @defaut true
     */
    requireVerification?: boolean;
    /**
     * @description
     * Sets the length of time that a verification token is valid for, after which the verification token must be refreshed.
     *
     * Expressed as a string describing a time span per
     * [zeit/ms](https://github.com/zeit/ms.js).  Eg: `60`, `'2 days'`, `'10h'`, `'7d'`
     *
     * @default '7d'
     */
    verificationTokenDuration?: string | number;
}

/**
 * @description
 * Defines custom states and transition logic for the order process state machine.
 *
 * @docsCategory orders
 */
export interface OrderProcessOptions<T extends string> {
    /**
     * @description
     * Define how the custom states fit in with the default order
     * state transitions.
     *
     */
    transtitions?: Partial<Transitions<T | OrderState>>;
    /**
     * @description
     * Define logic to run before a state tranition takes place. Returning
     * false will prevent the transition from going ahead.
     */
    onTransitionStart?(
        fromState: T,
        toState: T,
        data: { order: Order },
    ): boolean | Promise<boolean> | Observable<boolean> | void;
    /**
     * @description
     * Define logic to run after a state transition has taken place.
     */
    onTransitionEnd?(fromState: T, toState: T, data: { order: Order }): void;
    /**
     * @description
     * Define a custom error handler function for transition errors.
     */
    onTransitionError?(fromState: T, toState: T, message?: string): void;
}

/**
 * @docsCategory orders
 *
 * @docsWeight 0
 */
export interface OrderOptions {
    /**
     * @description
     * The maximum number of individual items allowed in a single order. This option exists
     * to prevent excessive resource usage when dealing with very large orders. For example,
     * if an order contains a million items, then any operations on that order (modifying a quantity,
     * adding or removing an item) will require Vendure to loop through all million items
     * to perform price calculations against active promotions and taxes. This can have a significant
     * performance impact for very large values.
     *
     * @default 999
     */
    orderItemsLimit?: number;
    /**
     * @description
     * Defines custom states and transition logic for the order process state machine.
     */
    process?: OrderProcessOptions<string>;
    /**
     * @description
     * Defines the strategy used to merge a guest Order and an existing Order when
     * signing in.
     *
     * @default MergeOrdersStrategy
     */
    mergeStrategy?: OrderMergeStrategy;
    /**
     * @description
     * Defines the strategy used to merge a guest Order and an existing Order when
     * signing in as part of the checkout flow.
     *
     * @default UseGuestStrategy
     */
    checkoutMergeStrategy?: OrderMergeStrategy;
}

/**
 * @description
 * The AssetOptions define how assets (images and other files) are named and stored, and how preview images are generated.
 *
 * {{% alert %}}
 * If you are using the `DefaultAssetServerPlugin`,
 * it is not necessary to configure these options.
 * {{% /alert %}}
 *
 * @docsCategory assets
 * @docsWeight 0
 */
export interface AssetOptions {
    /**
     * @description
     * Defines how asset files and preview images are named before being saved.
     *
     * @default DefaultAssetNamingStrategy
     */
    assetNamingStrategy: AssetNamingStrategy;
    /**
     * @description
     * Defines the strategy used for storing uploaded binary files.
     *
     * @default NoAssetStorageStrategy
     */
    assetStorageStrategy: AssetStorageStrategy;
    /**
     * @description
     * Defines the strategy used for creating preview images of uploaded assets.
     *
     * @default NoAssetPreviewStrategy
     */
    assetPreviewStrategy: AssetPreviewStrategy;
    /**
     * @description
     * The max file size in bytes for uploaded assets.
     *
     * @default 20971520
     */
    uploadMaxFileSize?: number;
}

/**
 * @docsCategory promotions
 *
 * @docsWeight 0
 */
export interface PromotionOptions {
    /**
     * @description
     * An array of conditions which can be used to construct Promotions
     */
    promotionConditions?: Array<PromotionCondition<any>>;
    /**
     * @description
     * An array of actions which can be used to construct Promotions
     */
    promotionActions?: Array<PromotionAction<any>>;
}

/**
 * @docsCategory shipping
 * @docsWeight 0
 */
export interface ShippingOptions {
    /**
     * @description
     * An array of available ShippingEligibilityCheckers for use in configuring ShippingMethods
     */
    shippingEligibilityCheckers?: Array<ShippingEligibilityChecker<any>>;
    /**
     * @description
     * An array of available ShippingCalculators for use in configuring ShippingMethods
     */
    shippingCalculators?: Array<ShippingCalculator<any>>;
}

/**
 * @description
 * Defines how transactional emails (account verification, order confirmation etc) are generated and sent.
 *
 * {{% alert %}}
 * It is usually not recommended to configure these yourself.
 * You should use the `DefaultEmailPlugin`.
 * {{% /alert %}}
 *
 * @docsCategory email
 * @docsWeight 0
 */
export interface EmailOptions<EmailType extends string> {
    /**
     * @description
     * Path to the email template files.
     *
     * @default __dirname
     */
    emailTemplatePath: string;
    /**
     * @description
     * Configuration for the creation and templating of each email type
     *
     * @default {}
     */
    emailTypes?: EmailTypes<EmailType>;
    /**
     * @description
     * The EmailGenerator uses the EmailContext and template to generate the email body
     *
     * @default NoopEmailGenerator
     */
    generator?: EmailGenerator;
    /**
     * @description
     * Configuration for the transport (email sending) method
     *
     * @default NoopTransportOptions
     */
    transport: EmailTransportOptions;
    /**
     * @description
     * An object containing any extra variables for use in email templates. For example,
     * the storefront URL could be defined here for use in password reset emails.
     *
     * @default {}
     */
    templateVars?: { [name: string]: any };
}

/**
 * @docsCategory payment
 *
 * @docsWeight 0
 */
export interface PaymentOptions {
    /**
     * @description
     * An array of payment methods with which to process payments.
     */
    paymentMethodHandlers: Array<PaymentMethodHandler<any>>;
}

/**
 * @docsCategory tax
 *
 * @docsWeight 0
 */
export interface TaxOptions {
    /**
     * @description
     * Defines the strategy used to determine the applicable Zone used in tax calculations.
     *
     * @default DefaultTaxZoneStrategy
     */
    taxZoneStrategy: TaxZoneStrategy;
    /**
     * @description
     * Defines the strategy used for calculating taxes.
     *
     * @default DefaultTaxCalculationStrategy
     */
    taxCalculationStrategy: TaxCalculationStrategy;
}

/**
 * @description
 * Options related to importing & exporting data.
 *
 * @docsCategory import-export
 */
export interface ImportExportOptions {
    /**
     * @description
     * The directory in which assets to be imported are located.
     *
     * @default __dirname
     */
    importAssetsDir?: string;
}

/**
 * @description
 * All possible configuration options are defined by the
 * [`VendureConfig`](https://github.com/vendure-ecommerce/vendure/blob/master/server/src/config/vendure-config.ts) interface.
 *
 * {{% alert %}}
 * Note on terminology: many of the configuration properties are named "Strategy" - this is because their use follows the
 * [Strategy Pattern](https://en.wikipedia.org/wiki/Strategy_pattern) of software design.
 * {{% /alert %}}
 *
 * @docsCategory
 * @docsWeight 0
 */
export interface VendureConfig {
    /**
     * @description
     * The path to the admin GraphQL API.
     *
     * @default 'admin-api'
     */
    adminApiPath?: string;
    /**
     * @description
     * The path to the admin GraphQL API.
     *
     * @default 'shop-api'
     */
    shopApiPath?: string;
    /**
     * @description
     * Configuration for the handling of Assets.
     */
    assetOptions?: AssetOptions;
    /**
     * @description
     * Configuration for authorization.
     */
    authOptions: AuthOptions;
    /**
     * @description
     * The name of the property which contains the token of the
     * active channel. This property can be included either in
     * the request header or as a query string.
     *
     * @default 'vendure-token'
     */
    channelTokenKey?: string;
    /**
     * @description
     * Set the CORS handling for the server. See the [express CORS docs](https://github.com/expressjs/cors#configuration-options).
     *
     * @default { origin: true, credentials: true }
     */
    cors?: boolean | CorsOptions;
    /**
     * @description
     * Defines custom fields which can be used to extend the built-in entities.
     *
     * @default {}
     */
    customFields?: CustomFields;
    /**
     * @description
     * The connection options used by TypeORM to connect to the database.
     */
    dbConnectionOptions: ConnectionOptions;
    /**
     * @description
     * The token for the default channel. If not specified, a token
     * will be randomly generated.
     *
     * @default null
     */
    defaultChannelToken?: string | null;
    /**
     * @description
     * The default languageCode of the app.
     *
     * @default LanguageCode.en
     */
    defaultLanguageCode?: LanguageCode;
    /**
     * @description
     * Configures the handling of transactional emails.
     */
    emailOptions?: EmailOptions<any>;
    /**
     * @description
     * Defines the strategy used for both storing the primary keys of entities
     * in the database, and the encoding & decoding of those ids when exposing
     * entities via the API. The default uses a simple auto-increment integer
     * strategy.
     *
     * @default new AutoIncrementIdStrategy()
     */
    entityIdStrategy?: EntityIdStrategy<any>;
    /**
     * @description
     * Set the hostname of the server. If not set, the server will be available on localhost.
     *
     * @default ''
     */
    hostname?: string;
    /**
     * @description
     * Configuration settings for data import and export.
     */
    importExportOptions?: ImportExportOptions;
    /**
     * @description
     * Configuration settings governing how orders are handled.
     */
    orderOptions?: OrderOptions;
    /**
     * @description
     * Custom Express middleware for the server.
     *
     * @default []
     */
    middleware?: Array<{ handler: RequestHandler; route: string }>;
    /**
     * @description
     * Configures available payment processing methods.
     */
    paymentOptions: PaymentOptions;
    /**
     * @description
     * An array of plugins.
     *
     * @default []
     */
    plugins?: VendurePlugin[];
    /**
     * @description
     * Which port the Vendure server should listen on.
     *
     * @default 3000
     */
    port: number;
    /**
     * @description
     * Configures the Conditions and Actions available when creating Promotions.
     */
    promotionOptions?: PromotionOptions;
    /**
     * @description
     * Configures the available checkers and calculators for ShippingMethods.
     */
    shippingOptions?: ShippingOptions;
    /**
     * @description
     * When set to true, no application logging will be output to the console.
     *
     * @default false
     */
    silent?: boolean;
    /**
     * @description
     * Configures how taxes are calculated on products.
     */
    taxOptions?: TaxOptions;
}
