import auth from '../../SpoAuth';
import config from '../../../../config';
import commands from '../../commands';
import {
  CommandOption, CommandValidate
} from '../../../../Command';
import SpoCommand from '../../SpoCommand';
import GlobalOptions from '../../../../GlobalOptions';
import { Auth } from '../../../../Auth';
import { ClientSidePage, CanvasSection } from './clientsidepages';
import { Page } from './Page';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  name: string;
  section: number;
  webUrl: string;
}

class SpoPageSectionGetCommand extends SpoCommand {
  public get name(): string {
    return `${commands.PAGE_SECTION_GET}`;
  }

  public get description(): string {
    return 'Get information about the specified modern page section';
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: (err?: any) => void): void {
    const resource: string = Auth.getResourceFromUrl(args.options.webUrl);

    if (this.debug) {
      cmd.log(`Retrieving access token for ${resource}...`);
    }

    auth
      .getAccessToken(resource, auth.service.refreshToken as string, cmd, this.debug)
      .then((accessToken: string): Promise<ClientSidePage> => {
        return Page.getPage(args.options.name, args.options.webUrl, accessToken, cmd, this.debug, this.verbose);
      })
      .then((clientSidePage: ClientSidePage): void => {
        const sections: CanvasSection[] = clientSidePage.sections
          .filter(section => section.order === args.options.section);

        const isJSONOutput = args.options.output === 'json';
        if (sections.length) {
          cmd.log(Page.getSectionInformation(sections[0], isJSONOutput));
        }

        if (this.verbose) {
          cmd.log(vorpal.chalk.green('DONE'));
        }

        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --webUrl <webUrl>',
        description: 'URL of the site where the page to retrieve is located'
      },
      {
        option: '-n, --name <name>',
        description: 'Name of the page to get section information of'
      },
      {
        option: '-s, --section <sectionId>',
        description: 'ID of the section for which to retrieve information'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.name) {
        return 'Required parameter name missing';
      }

      if (!args.options.webUrl) {
        return 'Required parameter webUrl missing';
      }

      if (!args.options.section) {
        return 'Required parameter section missing';
      }
      else {
        if (isNaN(args.options.section)) {
          return `${args.options.section} is not a number`;
        }
      }

      return SpoCommand.isValidSharePointUrl(args.options.webUrl);
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  ${chalk.yellow('Important:')} before using this command, log in to a SharePoint Online site
    using the ${chalk.blue(commands.LOGIN)} command.
        
  Remarks:

    To get information about a modern page section, you have to first log in to
    a SharePoint site using the ${chalk.blue(commands.LOGIN)} command,
    eg. ${chalk.grey(`${config.delimiter} ${commands.LOGIN} https://contoso.sharepoint.com`)}.

    If the specified ${chalk.grey('name')} doesn't refer to an existing modern 
    page, you will get a ${chalk.grey('File doesn\'t exists')} error.

  Examples:
  
    Get information about the specified section of the modern page
    named ${chalk.grey('home.aspx')}
      ${chalk.grey(config.delimiter)} ${this.name} --webUrl https://contoso.sharepoint.com/sites/team-a --name home.aspx --section 1
`);
  }
}

module.exports = new SpoPageSectionGetCommand();