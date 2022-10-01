import { access, mkdir, readdir, readFile, writeFile } from 'fs';
import { spawn } from 'child_process';
import { getRandomValues } from 'crypto';
import { basename } from 'path';

const sitesDirectory = '../sites-enabled';
const secretsDirectory = '../../secrets';
const certificatesDirectory = secretsDirectory + '/certbot/letsencrypt/live';
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

        const redirectBlock = `server {\n  listen 80;\n  server_name ${domain};\n  return 301 https://$host$request_uri;\n}`;

        const updatedConf =
          redirectBlock +
          '\n\n' +
          conf
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

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

const generateAuthenticationFile = (username) => {
  return new Promise((resolve, reject) => {
    const authenticationFile = secretsDirectory + '/.htpasswd';
    access(authenticationFile, (err) => {
      if (err) {
        const password = uuidv4();
        const hashedPassword = spawn('openssl', ['passwd', '-5', password]);

        hashedPassword.stdout.on('data', (data) => {
          writeFile(
            authenticationFile,
            `${username}:${data.toString()}`,
            (err) => {
              if (err) {
                reject(err);
              } else {
                console.log(
                  authenticationFile,
                  `written (password: ${password})`
                );
                resolve();
              }
            }
          );
        });

        hashedPassword.stderr.on('data', (data) => {
          reject(data.toString());
        });
      } else {
        console.log(authenticationFile, 'already exists');
        resolve();
      }
    });
  });
};

if (email) {
  getDomains()
    .then(async (domains) => {
      await generateAuthenticationFile(email);
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
