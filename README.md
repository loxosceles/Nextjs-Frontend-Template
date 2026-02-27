# nextjs-static-template

Project template for Next.js + AWS CDK (static export via S3/CloudFront).

## Usage

```bash
mkdir my-project && cd my-project
curl -fsSL https://raw.githubusercontent.com/loxosceles/nextjs-static-template/main/setup.sh | bash
```

## Structure

- `setup.sh` — Bootstrap script (runs on host)
- `scaffold/` — Project files extracted into new projects
- `devcontainer-defaults.env.template` — Host config reference

## Host Config

Copy `devcontainer-defaults.env.template` to `~/.config/devcontainer-defaults.env` and fill in values. The setup script reads this to auto-configure mounts and credentials.

## Security Recommendations

### For Production Deployment

1. **Content Security Policy (CSP)**: Add CSP headers in Next.js configuration
2. **IAM Policies**: Ensure least privilege IAM roles for AWS resources
3. **Security Headers**: Configure security headers in CloudFront distribution
4. **WAF Protection**: Consider adding Web Application Firewall for production
5. **CORS Configuration**: Implement proper CORS policies
6. **Environment Variables**: Never commit `.env` files with secrets
7. **Dependency Security**: Regularly update dependencies and audit for vulnerabilities

### Infrastructure Security
- Review and customize IAM policies in the CDK infrastructure
- Enable CloudFront logging and monitoring
- Consider adding rate limiting and DDoS protection
- Use AWS WAF for additional security layers
