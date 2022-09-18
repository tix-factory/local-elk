import { mkdir, readdir, readFile, writeFile } from 'fs';
import { spawn } from 'child_process';
import { basename } from 'path';

const sitesDirectory = '../sites-enabled';
const certificatesDirectory = '../../secrets/certbot/letsencrypt/live';
const email = process.argv[2];
const staging = false;

const getDomains = async () => {
  return new Promise((resolve, reject) => {
    readdir(sitesDirectory, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files.map((f) => basename(f, '.conf')));
      }
    });
  });
};

const createDirectory = (directory) => {
  return new Promise((resolve, reject) => {
    mkdir(directory, { recursive: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const enableSSL = (domain) => {
  return new Promise((resolve, reject) => {
    readFile(`${sitesDirectory}/${domain}.conf`, (err, conf) => {
      if (err) {
        reject(err);
      } else {
        const domainDirectory = domain + (staging ? '-0001' : '');
        const sslBlock =
          `ssl_certificate /etc/letsencrypt/live/${domainDirectory}/fullchain.pem;` +
          `\n  ssl_certificate_key /etc/letsencrypt/live/${domainDirectory}/privkey.pem;`;

        const updatedConf = conf
          .toString()
          .replace('listen 443', 'listen 443 ssl')
          .replace(/# SSL.+/, sslBlock);

        writeFile(
          `${sitesDirectory}/../sites-available/${domain}.conf`,
          updatedConf,
          (writeError) => {
            if (writeError) {
              reject(writeError);
            } else {
              resolve();
            }
          }
        );
      }
    });
  });
};

const crash = (e) => {
  console.error(e);
  process.exit(1);
};

const renewCertificate = (domain) => {
  return new Promise(async (resolve, reject) => {
    try {
      const args = [
        'run',
        '--rm',
        'certbot',
        'certonly',
        '--webroot',
        '--webroot-path',
        `/tmp/letsencrypt`,
        '--preferred-challenges',
        'http-01',
        '--agree-tos',
        '--keep-until-expiring',
        '--email',
        email,
        '--domains',
        domain,
        '--verbose',
        '--non-interactive',
      ];

      if (staging) {
        args.push('--staging');
      }

      console.log('Renewing certificate:', args);

      const certbot = spawn('docker-compose', args);

      certbot.stdout.on('data', (data) => {
        console.log(data.toString());
      });

      certbot.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      certbot.on('close', async (code) => {
        if (code === 0) {
          try {
            await enableSSL(domain);
            resolve();
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Failed to renew certificate for ${domain}`));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

if (email) {
  getDomains()
    .then(async (domains) => {
      await createDirectory(certificatesDirectory);

      for (let i = 0; i < domains.length; i++) {
        try {
          await renewCertificate(domains[i]);
        } catch (e) {
          crash(e);
        }
      }
    })
    .catch(crash);
} else {
  crash('email (first argument) is required');
}
