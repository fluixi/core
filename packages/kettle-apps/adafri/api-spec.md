We need to align the current adafri app the the following api model wih the provided interfaces
Don't redifine thes interface you can import the from "@awc/helpers"

on auth-client you should define the methods the interact with the api should be defined as utilities for example fecth user and use it with defined params and give the ability to refecth the user profile every 30minutes to get the last values if we have change.


A user:
can be imported with "@awc/helpers/user"
    interface User {
    uid?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    photoURL?: string;
    displayName?: string;
    entrepriseName?: string;
    addresse?: string;
    telephone?: string;
    postal?: string;
    isConnectWithMailAndPassword?: boolean;
    user_type?: string;
    hasApprouvedPolicy?: boolean;
    authorizedPush?: boolean;
    token?: any;
    isCorporate?: boolean;
    isParticular?: boolean;
    entrepriseUrl?: string;
    profileCompleted?: boolean;
    deviceInfo?: any;
    showPushToken?: boolean;
    phoneInfo?: {
        ['number']: string;
        internationalNumber: string;
        nationalNumber: string;
        e164Number: string;
        countryCode: string;
        dialCode: string;
    };
    provider?: string;
    isActive?: boolean;
    status?: string;
}

    GET: https://api.adafri.dev/user/{{uid}}?fields=displayName,firstName,lastName,email,entrepriseName,entrepriseUrl,phoneInfo.countryCode
    A user can have one or multiple ad accounts or invited on an Ad account
    Retrieve a list of ad accounts owned by a user:
        GET: curl --location --globoff 'https://api.adafri.dev/user/{{djombi_uid}}/accounts?fields=id%2Cname' \
--header 'Authorization: ••••••'

        Result: {"data": {
                "linked": [],
                "owned": []
            },
            "status": "ok",
            "status_code": 200}
    Update a user:
        curl --location --globoff 'https://api.adafri.dev/user/{{djombi_uid}}' \
            --header 'Content-Type: application/json' \
            --header 'Authorization: ••••••' \
            --data '{
            "data":  {
                    "entrepriseUrl": "https://adafri.co"
            }
            }'
Accounts:
can be imported with "@awc/helpers/accounts"
    interface Account {
        id: string;
        name: string;
        status: string;
        owner: string;
        owner_email?: string;
        creationDate?: number;
        creationDateString?: string;
        account_value: number;
    }
    interface ListAccountsResponse{
        linked?: Account[];
        owned: Account[]
    }
    GET: curl --location 'https://api.adafri.dev/accounts/{{accountId}}?fields=id%2Cname%2Caccount_value%2Cowner_email' \
--header 'Authorization: ••••••'
    LIST_ACCOUNTS_OF_A_USER: curl --location 'https://api.adafri.dev/accounts/list/{{uid}}?fields=id%2Cname' \

    UPDATE_AN_ACCOUNT: curl --location --globoff 'https://api.adafri.dev/account/{{accountID}}' \
--header 'Content-Type: application/json' \
--header 'Authorization: ••••••' \
--data '{
    "data": {
        "account_value": 70
    }
}'

GOOGLE_ADS_DISPLAY:
    can be imported with "@awc/helpers/campaigns"
    CAMPAIGN:
    interface Display {
        id?: string;
        id_campagne?: number;
        name?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        targetedLocations?: LOCATION[];
        excludedLocations?: LOCATION[];
        numberOfDays?: number;
        budgetId?: number;
        dailyBudget?: number;
        realBudget?: number;
        realDailyBudget?: number;
        budget?: number;
        startDateFrench?: string;
        endDateFrench?: string;
        startDateFormattedGoogle?: string;
        endDateFormattedGoogle?: string;
        startDateEnglish?: string;
        endDateEnglish?: string;
        targetedPlacements?: WEBSITE[];
        excludedPlacements?: WEBSITE[];
        youtubeChannels?: YOUTUBE_CHANNELS_INTERFACE[];
        youtubeVideos?: YOUTUBE_VIDEOS_INTERFACE[];
        websites?: WEBSITE[];
        urlPromote?: string;
        strategie?: string;
        bid?: number;
        ages?: AGES_TYPE[];
        genders?: GENDERS_TYPE[];
        adsSchedules?: SCHEDULE_INTERFACE[];
        devicesTargeted?: DEVICE_INTERFACE[];
        devicesExcluded?: DEVICE_INTERFACE[];
        impressions?: number;
        totalImpressions?: number;
        totalClics?: number;
        clicks?: number;
        costs?: number;
        ctr?: number;
        servingStatus?: string;
        dueDate?: any;
        createdAt?: any;
        createdBy?: any;
        adsSchedulesCriterion?: any;
        ad_group_id?: number;
        ad_group_id_firebase?: any;
        owner?: string;
        last_check_date?: string;
        last_check_time?: number;
        last_daily_cost?: number;
        type?: string;
        isPayed?: boolean;
        isEdited?: boolean;
        isEnded?: boolean;
        isArchived?: boolean;
        isUsedPack?: boolean;
        packType?: string;
        isComplete?: boolean;
        format?: any;
        isUsePromoteCode?: boolean;
        budgetEnded?: boolean;
        isExpress?: boolean;
        accountId?: string;
        ActiveViewImpressions?: any;
        ActiveViewMeasurability?: any;
        ActiveViewMeasurableCost?: any;
        ActiveViewMeasurableImpressions?: any;
        PercentNewVisitors?: any;
        Interactions?: any;
        InteractionTypes?: any;
        NumOfflineImpressions?: any;
        NumOfflineInteractions?: any;
        Conversions?: any;
        ConversionRate?: any;
        ConversionValue?: any;
        devices?: any;
        Ctr?: any;
        areaTargetedOption?: string;
        areaExcludedOption?: string;
        objective?: OBJECTIVES;
        adChannel?: CHANNEL_FORMAT;
        user_interest?: USER_INTEREST[];
        isUnlockedPlacements?: boolean;
        // featureUnlocked?: FEATURES_TO_UNLOCK;
        featurePayed?: boolean;
        trackingTemplate?: string;
        finalUrlSuffix?: string;
        urlCustomParameters?: CustomParameters[];
        clientCustomerId: string;
        deliveryMethod?: string;
        provider?: string;
        publish?: boolean;
        publishing?: boolean;
        screenshot?: string;
        creationTime?: any;
        publicationDate?: any;
        endedAt?: any;
        is_removed?: boolean;
    }
    interface OBJECTIVES {
        obj_id: string;
        primary: {
            icon: string;
            title: string;
        };
        secondary: {
            icon: string;
            title: string;
            description: string;
        };
    }
    interface CHANNEL_FORMAT {
        obj_id: string;
        primary: {
            icon: string;
            title: string;
            description: string;
        };
        secondary: {
            icon: string;
            title: string;
            description: string;
        };
    }
    interface LOCATION {
        id?: number;
        locationName?: string;
        displayType?: string;
        targetingStatus?: string;
        reach?: number;
        canonicalName?: string;
        criterionId?: number;
        locationResponse?: any;
    }
    interface SCHEDULE_INTERFACE {
        id: string;
        dayEN: string;
        dayFR: string;
        endHour: string;
        endMinute: string;
        end_hour_text: string;
        startHour: string;
        startMinute: string;
        start_hour_text: string;
        criterionId?: number;
        criterionType?: string;
    }
    interface CustomParameters {
        key?: string;
        value?: string;
    }
    interface AGES_TYPE {
        text?: string;
        ageRangeType?: string;
        criterionId?: number;
        citerionType?: string;
        type?: string;
    }

    interface GENDERS_TYPE {
        text?: string;
        gendersRangeType?: string;
        criterionId?: number;
        citerionType?: string;
        type?: string;
    }

    interface DEMOGRAPHICS {
        ages: AGES_TYPE[];
        genders: GENDERS_TYPE[];
    }
    interface DEVICE_INTERFACE {
        id?: number;
        criterionId?: number;
        name?: string;
        type?: string;
        criterionType?: string;
        isTargeted?: boolean;
        isExcluded?: boolean;
    }
    interface WEBSITE {
        id?: string;
        url?: string;
        criterionId?: number;
        criterionType?: string;
        auth?: string;
        hash?: string;
        host?: string;
        hostname?: string;
        href?: string;
        origin?: string;
        password?: string;
        pathname?: string;
        port?: string;
        protocol?: string;
        query?: { [key: string]: string | undefined };
        slashes?: boolean;
        username?: string;
    }

    interface YOUTUBE_CHANNELS_INTERFACE {
        id?: string;
        channelId?: string;
        name?: string;
        snippet?: string;
        thumbnails?: string;
    }

    interface YOUTUBE_VIDEOS_INTERFACE {
        id?: string;
        videoId?: string;
        name?: string;
        snippet?: string;
        thumbnails?: string;
    }
    interface USER_INTEREST {
        id?: string;
        criterionId?: number;
        name: string;
        userInterestParentId?: string;
        type?: string;
        criterionType?: string;
        isTargeted?: boolean;
        isExcluded?: boolean;
    }


    interface FetchedUserInterest {
        brand: USER_INTEREST[];
        in_market: USER_INTEREST[];
        mobile_app_installer: USER_INTEREST[];
    }
        A campaign is attached to an account
        LIST_CAMPAIGNS_ATTACHED_TO_AN_ACCOUNT: curl --location 'https://api.adafri.dev/gads/display/list/{{aacid}}?fields=id%2Cname%2Cid_campagne%2CcreatedAt%2CcreatedBy%2CaccountId%2Cobjective%2Cobjective.obj_id' \
    --header 'Authorization: ••••••'
        GET A campaign: curl --location 'https://api.adafri.dev/gads/display/{{campaignId}}?fields=id%2Cname%2CaccountId%2Cid_campagne%2CtargetedPlacements%2Cimages%2CcreatedAt%2CcreatedBy%2Cobjective.obj_id%2CendDate&account_id=Ya8ClS89iAqtBFrLfMNR' \
    --header 'Authorization: ••••••'
        UPDATE a campaign: curl --location --request PUT 'https://api.adafri.dev/gads/display/{{campaignId}}' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: ••••••' \
    --data '{
        "data": {
            "startDate": "2025-05-30"
            
        }
    }'
        PUBLISH A CAMPAIGN: curl --location --request POST 'https://api.adafri.dev/gads/display/{{campaignId}}/publish' \
    --header 'Authorization: ••••••'

        CREATE a campign: curl --location 'https://api.adafri.dev/gads/display/create?fields=id%2Cname%2CcreatedAt%2CcreatedBy%2CaccountId%2Cstatus%2Cobjective.obj_id%2CstartDate%2CendDate' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: ••••••' \
    --data '{
        "data": {
            "name": "Campaign-test-api",
            "startDate": "21/05/2025",
            "status": "PAUSED",
            "budget": 4,
            "dailyBudget": 4,
            "urlPromote": "https://adafri.co",
            "provider": "https://adafri.app"
        },
        "accountId": "{{accountId}}"
    }'
    ADGROUP:
    interface AdGroupBase {
        id?: string;
        campaign_id_parent?: string;
        campaign_id?: number;
        ad_group_id?: number;
        name?: string;
        status?: any;
        ages?: AGES_TYPE[];
        genders?: GENDERS_TYPE[];
        devicesTargeted?: DEVICE_INTERFACE[];
        devicesExcluded?: DEVICE_INTERFACE[];
        targetedPlacements?: WEBSITE[];
        excludedPlacements?: WEBSITE[];
        youtubeChannels?: YOUTUBE_CHANNELS_INTERFACE[];
        youtubeVideos?: YOUTUBE_VIDEOS_INTERFACE[];
        websites?: WEBSITE[];
        user_interest?: USER_INTEREST[];
        createdAt?: any;
        createdBy?: any;
        owner?: any;
        accountId?: string;
        clientCustomerId: string;
    }
        An adgroup is attached to an account and a campaign:
            LIST: curl --location 'https://api.adafri.dev/gads/display/adgroups/list/{{campignId}}?fields=id%2Cname%2Ccampaign_id%2Cages.criterionId%2Cgenders%2CtargetedPlacements%2CexcludedPlacements%2Cuser_interest%2Cimages%2CimagesNative%2Cad_group_id%2Cis_removed' \
            --header 'Authorization: ••••••'
                    GET: curl --location 'https://api.adafri.dev/gads/display/adgroups/{{adGroupId}}?fields=id%2Cname%2Cid_campagne%2CtargetedPlacements%2CexcludedPlacements%2Cimages%2CimagesNative%2Cad_group_id%2Cages.criterionId%2Cowner%2CaccountId%2Cis_published' \
            --header 'Authorization: ••••••'
                    DELETE: curl --location --request DELETE 'https://api.adafri.dev/gads/display/adgroups/{{adGroupId}}' \
            --header 'Authorization: ••••••'
                    CREATE: curl --location 'https://api.adafri.dev/gads/display/adgroups/create?fields=id%2Cname%2CcreatedAt%2CcreatedBy%2CaccountId%2Cstatus%2Ccampaign_id_parent' \
            --header 'Content-Type: application/json' \
            --header 'Authorization: ••••••' \
            --data '{
                "data": {
                    "name": "Adgroup-test-api-3"
                },
                "campaignId": "{{campaignId}}"
            }'
                UPDATE: curl --location --request PUT 'https://api.adafri.dev/gads/display/adgroups/BuSESUkUPxDR90T1DCLr' \
            --header 'Content-Type: application/json' \
            --header 'Authorization: ••••••' \
            --data '{
                "data": {
                    "websites": [{"url": "https://adafri.app"}],
                    "user_interest": [{"ls": "brand"}]
                },
                "operation": "create"
            }'
    AD:
    interface ImageAd {
        id?: string;
        name?: string;
        mediaId?: string;
        type?: string;
        referenceId?: number;
        urls?: any;
        mimeType?: any;
        width?: number;
        height?: number;
        fileSize?: any;
        file?: File;
        path?: string;
        url?: string;
        isUploading?: boolean;
        isUploaded?: boolean;
        filename?: string;
    }
    interface NativeAd {
        id?: string;
        _id?: string;
        ad_id?: number;
        status?: string;
        adData?: NATIVE_ADS_TO_PUBLISH;
        headlines?: ASSET_TEXT[];
        longHeadline?: ASSET_TEXT;
        descriptions?: ASSET_TEXT[];
        businessName?: string;
        youTubeVideos?: VIDEO_ASSET[];
        marketingImages?: ASSETS_NATIVE[];
        squareMarketingImages?: ASSETS_NATIVE[];
        logoImages?: ASSETS_NATIVE[];
        squareLogoImages?: ASSETS_NATIVE[];
        createdAt?: any;
        createdBy?: any;
        ad_group_id?: number;
        accountId?: string;
        owner?: string;
        clientCustomerId: string;
        is_removed?: boolean;
        ad?: any;
        combinedApprovalStatus?: any;
        ad_copy_from?: string;
        finalUrl?: string
    }
    An ad is attached to an Adgroup:
        GET: curl --location --globoff --request GET 'https://api.adafri.dev/gads/display/adgroups/ads/Dnctyw7VPazWQhlcA9Lc?fields=id%2Cname%2Cad_group_id%2Curls%2Cwidth%2Cheight%2Curl_image%2CdisplayUrl%2CfinalUrls%2CfinalAppUrls%2Ctype%2Cad_type%2Cad_name%2CmediaId%2CclientCustomerId&accountId=fNhcWbvVlKdrGHaCuhsr' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: ••••••' \
--data-urlencode 'accountId=fNhcWbvVlKdrGHaCuhsr'
        LIST: curl --location --globoff 'https://api.adafri.dev/gads/display/adgroups/ads/list/{{adgroupId}}?fields=id%2Cname%2Cad_group_id%2CmarketingImages.assetId%2CmarketingImages.id%2CmarketingImages.width%2CmarketingImages.height%2CmarketingImages.url%2CmarketingImages.imageUrl%2CmarketingImages.usage%2CmarketingImages.useFor%2CsquareMarketingImages.assetId%2CsquareMarketingImages.id%2CsquareMarketingImages.width%2CsquareMarketingImages.height%2CsquareMarketingImages.url%2CsquareMarketingImages.imageUrl%2CsquareMarketingImages.usage%2CsquareMarketingImages.useFor%2ClogoImages.assetId%2ClogoImages.id%2ClogoImages.width%2ClogoImages.height%2ClogoImages.url%2ClogoImages.imageUrl%2ClogoImages.usage%2ClogoImages.useFor%2CsquareLogoImages.assetId%2CsquareLogoImages.id%2CsquareLogoImages.width%2CsquareLogoImages.height%2CsquareLogoImages.url%2CsquareLogoImages.imageUrl%2CsquareLogoImages.usage%2CsquareLogoImages.useFor' \
--header 'Authorization: Bearer Authorization: ••••••'
        PUBLISH: curl --location --globoff --request POST 'https://api.adafri.dev/gads/display/adgroups/ads/Fgu56vOVCgeQrpM2Bo8h/publish' \
--header 'Authorization: ••••••'




We assume that all api request response follow object like:
{"data": <Response data>,
"status": "ok" | "error",
"status_code": 200 | 400 | 500 | 504....}

And all requests that need to access to a resource need to explicitly specify the fields that we need on the response examples: fields=id,name,accountId,user.name,item.item1.item2,....

