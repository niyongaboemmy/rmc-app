import { SocialService } from './social.service';
export declare class SocialController {
    private readonly service;
    constructor(service: SocialService);
    getFeed(): Promise<import("./social.types").SocialFeed>;
    refresh(): Promise<import("./social.types").SocialFeed>;
}
